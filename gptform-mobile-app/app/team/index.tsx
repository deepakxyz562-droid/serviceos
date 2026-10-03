import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/auth-store';
import { hapticFeedback } from '@/lib/haptics';

interface TeamMember {
  id: string;
  name: string;
  subtitle?: string;
  badge: 'Owner' | 'AI Agent' | 'Chatbot';
  avatarType: 'initial' | 'ai' | 'instagram' | 'sms' | 'whatsapp';
  initial?: string;
  status: 'online' | 'busy' | 'offline';
  isAi?: boolean;
}

const AI_BOTS: TeamMember[] = [
  {
    id: 'ai-receptionist',
    name: 'AI agent',
    subtitle: 'Website · Instagram · WhatsApp',
    badge: 'AI Agent',
    avatarType: 'ai',
    status: 'online',
    isAi: true,
  },
  {
    id: 'bot-instagram',
    name: 'Instagram',
    subtitle: 'DM Automation & Comment triggers',
    badge: 'Chatbot',
    avatarType: 'instagram',
    initial: 'I',
    status: 'busy',
    isAi: true,
  },
  {
    id: 'bot-sms',
    name: 'SMS',
    subtitle: 'Twilio SMS Gateway',
    badge: 'Chatbot',
    avatarType: 'sms',
    initial: 'S',
    status: 'busy',
    isAi: true,
  },
  {
    id: 'bot-whatsapp',
    name: 'WhatsApp message',
    subtitle: 'Cloud API Business Number',
    badge: 'Chatbot',
    avatarType: 'whatsapp',
    initial: 'W',
    status: 'busy',
    isAi: true,
  },
];

export default function TeamScreen() {
  const { user } = useAuthStore();

  const ownerMember: TeamMember = {
    id: user?.id || 'owner',
    name: user?.name || 'Account Owner',
    subtitle: user?.email || 'Active Account',
    badge: 'Owner',
    avatarType: 'initial',
    initial: (user?.name?.[0] || user?.email?.[0] || 'O').toUpperCase(),
    status: 'online',
  };

  const teamList = [ownerMember, ...AI_BOTS];

  const handleMemberPress = (member: TeamMember) => {
    hapticFeedback.light();
    if (member.isAi) {
      Alert.alert(member.name, 'Manage AI Employee', [
        {
          text: 'Train Knowledge Base',
          onPress: () => router.push('/team/train-agent'),
        },
        {
          text: 'Configure Agent',
          onPress: () => router.push('/team/create-agent'),
        },
        {
          text: 'Test in Chat',
          onPress: () => router.push('/chat/session-urgent-1'),
        },
        { text: 'Cancel', style: 'cancel' },
      ]);
    } else {
      Alert.alert('Owner', `${member.name} (${member.subtitle})`);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      {/* Header: < Team + (matches 18.35.50 (1).jpeg) */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerBtn}
          activeOpacity={0.7}
        >
          <MaterialIcons name="arrow-back-ios" size={20} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Team</Text>
        <TouchableOpacity
          onPress={() => {
            hapticFeedback.light();
            router.push('/team/create-agent');
          }}
          style={styles.headerBtn}
          activeOpacity={0.7}
        >
          <MaterialIcons name="add" size={26} color="#0f172a" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {teamList.map((member) => (
          <TouchableOpacity
            key={member.id}
            style={styles.memberRow}
            onPress={() => handleMemberPress(member)}
            activeOpacity={0.75}
          >
            {/* Avatar */}
            <View style={styles.avatarWrap}>
              {member.avatarType === 'ai' ? (
                <View style={styles.aiAvatarCircle}>
                  <MaterialIcons name="auto-awesome" size={22} color="#facc15" />
                </View>
              ) : (
                <View
                  style={[
                    styles.initialAvatarCircle,
                    member.avatarType === 'instagram' && { backgroundColor: '#3b82f6' },
                    member.avatarType === 'sms' && { backgroundColor: '#2563eb' },
                    member.avatarType === 'whatsapp' && { backgroundColor: '#8b5cf6' },
                    member.avatarType === 'initial' && { backgroundColor: '#ca8a04' },
                  ]}
                >
                  <Text style={styles.initialText}>{member.initial || 'D'}</Text>
                </View>
              )}

              {/* Status dot */}
              <View
                style={[
                  styles.statusDot,
                  member.status === 'online'
                    ? { backgroundColor: '#10b981' }
                    : { backgroundColor: '#ef4444' },
                ]}
              />
            </View>

            {/* Info */}
            <View style={styles.infoCol}>
              <Text style={styles.memberName}>{member.name}</Text>
              {member.subtitle ? (
                <Text style={styles.memberSub} numberOfLines={1}>
                  {member.subtitle}
                </Text>
              ) : null}
            </View>

            {/* Badge */}
            <View
              style={[
                styles.badgeWrap,
                member.badge === 'Owner'
                  ? styles.ownerBadge
                  : member.badge === 'AI Agent'
                  ? styles.aiBadge
                  : styles.botBadge,
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  member.badge === 'Owner'
                    ? styles.ownerBadgeText
                    : member.badge === 'AI Agent'
                    ? styles.aiBadgeText
                    : styles.botBadgeText,
                ]}
              >
                {member.badge}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  avatarWrap: {
    position: 'relative',
    marginRight: 14,
  },
  initialAvatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  aiAvatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDot: {
    position: 'absolute',
    top: -1,
    right: -1,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  infoCol: {
    flex: 1,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  memberSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  badgeWrap: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ownerBadge: {
    backgroundColor: '#dcfce7',
  },
  ownerBadgeText: {
    color: '#15803d',
    fontSize: 11,
    fontWeight: '700',
  },
  aiBadge: {
    backgroundColor: '#f3e8ff',
  },
  aiBadgeText: {
    color: '#7e22ce',
    fontSize: 11,
    fontWeight: '700',
  },
  botBadge: {
    backgroundColor: '#ede9fe',
  },
  botBadgeText: {
    color: '#6d28d9',
    fontSize: 11,
    fontWeight: '700',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
