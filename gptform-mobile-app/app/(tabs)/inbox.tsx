import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import {
  Search,
  MessageSquare,
  Bot,
  Radio,
  Phone,
  CheckCheck,
  ChevronRight,
  Sparkles,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { hapticFeedback } from '@/lib/haptics';
import type { ChannelType } from '@/types';

interface DemoSession {
  id: string;
  name: string;
  channel: 'ai' | 'live_chat' | 'whatsapp' | 'sms';
  status: 'waiting_for_agent' | 'active' | 'booked' | 'resolved';
  lastMessage: string;
  time: string;
  unread: boolean;
  formName: string;
}

const MOCK_SESSIONS: DemoSession[] = [
  {
    id: 'session-urgent-1',
    name: 'Sarah Jenkins',
    channel: 'live_chat',
    status: 'waiting_for_agent',
    lastMessage: 'Can I speak with a real technician about an urgent boiler leak?',
    time: '2m ago',
    unread: true,
    formName: 'Emergency Plumbing Form',
  },
  {
    id: 'session-2',
    name: 'John Smith',
    channel: 'ai',
    status: 'active',
    lastMessage: 'I need a quote for heating repair in Austin. We have 3 bedrooms.',
    time: '8m ago',
    unread: false,
    formName: 'HVAC Quote Request',
  },
  {
    id: 'session-3',
    name: 'Priya Patel',
    channel: 'whatsapp',
    status: 'booked',
    lastMessage: 'Thanks! Appointment confirmed for tomorrow 10:30 AM.',
    time: '21m ago',
    unread: false,
    formName: 'Dental Consultation',
  },
  {
    id: 'session-4',
    name: 'Mike Vance',
    channel: 'sms',
    status: 'resolved',
    lastMessage: 'Deposit paid via Stripe link. See you Monday.',
    time: '1h ago',
    unread: false,
    formName: 'Roofing Estimate',
  },
  {
    id: 'session-5',
    name: 'Emma Watson',
    channel: 'ai',
    status: 'active',
    lastMessage: 'What are your rates for end-of-tenancy deep cleaning?',
    time: '2h ago',
    unread: false,
    formName: 'Home Cleaning Intake',
  },
];

const CHANNELS: { id: ChannelType; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'ai', label: '🤖 AI Active' },
  { id: 'live_chat', label: '💬 Live Chat' },
  { id: 'whatsapp', label: '📱 WhatsApp' },
  { id: 'sms', label: '✉️ SMS' },
];

export default function InboxScreen() {
  const [selectedChannel, setSelectedChannel] = useState<ChannelType>('all');
  const [search, setSearch] = useState('');

  const filteredSessions = MOCK_SESSIONS.filter((s) => {
    if (selectedChannel !== 'all' && s.channel !== selectedChannel) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        s.lastMessage.toLowerCase().includes(q) ||
        s.formName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleOpenChat = async (id: string) => {
    await hapticFeedback.light();
    router.push(`/chat/${id}`);
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <StatusBar barStyle="light-content" />
      <View className="flex-1 px-4 sm:px-6 pt-3">
        {/* Header */}
        <View className="flex-row items-center justify-between py-2 mb-2">
          <View>
            <Text className="text-2xl font-black text-white tracking-tight">Unified Inbox</Text>
            <Text className="text-xs text-slate-400 mt-0.5">
              AI Conversations, Live Chats, WhatsApp &amp; SMS
            </Text>
          </View>
        </View>

        {/* Search Bar */}
        <View className="flex-row items-center bg-slate-900 border border-slate-800 rounded-2xl px-3.5 h-11 mb-3">
          <Search size={16} color="#64748B" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search conversations, visitors, forms..."
            placeholderTextColor="#475569"
            className="flex-1 text-xs text-white ml-2 font-medium"
          />
        </View>

        {/* Channel Filter Pills */}
        <View className="mb-3">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
            {CHANNELS.map((ch) => {
              const active = selectedChannel === ch.id;
              return (
                <TouchableOpacity
                  key={ch.id}
                  onPress={async () => {
                    await hapticFeedback.light();
                    setSelectedChannel(ch.id);
                  }}
                  className={`px-3 py-1.5 rounded-xl border mr-2 ${
                    active
                      ? 'bg-emerald-500 border-emerald-400'
                      : 'bg-slate-900 border-slate-800'
                  }`}
                >
                  <Text
                    className={`text-[11px] font-bold ${
                      active ? 'text-slate-950' : 'text-slate-400'
                    }`}
                  >
                    {ch.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Conversation List */}
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 110 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="space-y-2.5">
            {filteredSessions.map((session) => {
              const isUrgent = session.status === 'waiting_for_agent';
              return (
                <TouchableOpacity
                  key={session.id}
                  onPress={() => handleOpenChat(session.id)}
                  activeOpacity={0.85}
                  className={`p-4 rounded-3xl border ${
                    isUrgent
                      ? 'bg-red-950/30 border-red-500/50 shadow-md shadow-red-500/10'
                      : 'bg-slate-900/90 border-slate-800'
                  }`}
                >
                  <View className="flex-row items-center justify-between mb-1.5">
                    <View className="flex-row items-center gap-2">
                      <View className="size-8 rounded-full bg-slate-800 items-center justify-center">
                        <Text className="text-xs font-black text-white">
                          {session.name.charAt(0)}
                        </Text>
                      </View>
                      <View>
                        <Text className="text-sm font-bold text-white">{session.name}</Text>
                        <Text className="text-[10px] text-slate-400 font-medium">
                          {session.formName}
                        </Text>
                      </View>
                    </View>

                    <View className="items-end">
                      <Text className="text-[10px] text-slate-500 font-semibold">{session.time}</Text>
                      {/* Status Badges */}
                      {isUrgent && (
                        <View className="flex-row items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-red-500">
                          <Text className="text-[9px] font-extrabold text-white uppercase tracking-wider">
                            ● Human Requested
                          </Text>
                        </View>
                      )}
                      {session.status === 'active' && (
                        <View className="flex-row items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
                          <Text className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider">
                            ● AI Active
                          </Text>
                        </View>
                      )}
                      {session.status === 'booked' && (
                        <View className="flex-row items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30">
                          <Text className="text-[9px] font-bold text-purple-400 uppercase tracking-wider">
                            ✓ Booked
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <Text
                    numberOfLines={2}
                    className={`text-xs mt-1 leading-relaxed ${
                      isUrgent ? 'text-red-200 font-semibold' : 'text-slate-300 font-normal'
                    }`}
                  >
                    {session.lastMessage}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
