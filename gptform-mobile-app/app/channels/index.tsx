import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons';

interface ChannelItem {
  id: string;
  name: string;
  category: string;
  description: string;
  iconName: string;
  iconType: 'fa' | 'ionicons' | 'mci';
  color: string;
  connected: boolean;
  statusText: string;
  route?: string;
}

export default function ChannelsScreen() {
  const router = useRouter();

  const channels: ChannelItem[] = [
    {
      id: 'whatsapp',
      name: 'WhatsApp Business',
      category: 'MESSAGING',
      description: 'Receive and reply to WhatsApp messages directly in your unified inbox with AI auto-pilot.',
      iconName: 'whatsapp',
      iconType: 'fa',
      color: '#25D366',
      connected: true,
      statusText: 'Connected (+1 415-555-0192)',
      route: '/channels/whatsapp',
    },
    {
      id: 'website',
      name: 'Website Chat Widget',
      category: 'WEB',
      description: 'Live chat & AI assistant widget for your website, landing pages, and web apps.',
      iconName: 'globe-outline',
      iconType: 'ionicons',
      color: '#0284C7',
      connected: true,
      statusText: 'Active on 1 domain (hydroplumbing.org)',
      route: '/channels/website',
    },
    {
      id: 'instagram',
      name: 'Instagram Direct',
      category: 'SOCIAL',
      description: 'Turn Instagram followers and DM inquiries into qualified leads and bookings automatically.',
      iconName: 'instagram',
      iconType: 'fa',
      color: '#E1306C',
      connected: false,
      statusText: 'Not connected',
    },
    {
      id: 'sms',
      name: 'SMS / Text Messaging',
      category: 'MOBILE',
      description: 'Two-way SMS text conversations powered by Twilio phone numbers.',
      iconName: 'chatbox-ellipses',
      iconType: 'ionicons',
      color: '#6366F1',
      connected: false,
      statusText: 'Not connected',
    },
    {
      id: 'email',
      name: 'Email Forwarding',
      category: 'INBOX',
      description: 'Forward support emails into tickets and manage replies within GPTForm.',
      iconName: 'mail-outline',
      iconType: 'ionicons',
      color: '#F59E0B',
      connected: false,
      statusText: 'support@hydroplumbing.org (Forwarding)',
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
            Connect your customer touchpoints. When a customer reaches out via WhatsApp, website, or Instagram, your trained AI agent answers instantly and surfaces hot leads directly to your phone.
          </Text>
        </View>

        {/* Channels List */}
        <Text style={styles.sectionTitle}>AVAILABLE CHANNELS</Text>

        {channels.map((channel) => (
          <TouchableOpacity
            key={channel.id}
            style={styles.channelCard}
            onPress={() => {
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
                {channel.iconType === 'ionicons' && (
                  <Ionicons name={channel.iconName as any} size={24} color={channel.color} />
                )}
                {channel.iconType === 'mci' && (
                  <MaterialCommunityIcons name={channel.iconName as any} size={24} color={channel.color} />
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
                      <Text style={styles.connectActionText}>Connect</Text>
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
                <Text style={styles.manageText}>{channel.connected ? 'Manage' : 'Setup'}</Text>
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
    marginBottom: 24,
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
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.8,
    marginBottom: 12,
    marginLeft: 4,
  },
  channelCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
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
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  channelCategory: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  connectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 5,
  },
  connectedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#15803D',
  },
  connectActionBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  connectActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3B82F6',
  },
  channelDesc: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 14,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  statusText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  activeStatusText: {
    color: '#059669',
    fontWeight: '500',
  },
  manageRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  manageText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
    marginRight: 4,
  },
});
