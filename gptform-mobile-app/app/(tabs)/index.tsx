import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import {
  Sparkles,
  Bell,
  MessageSquare,
  Target,
  Calendar,
  Zap,
  ArrowRight,
  Bot,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Radio,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/auth-store';
import { hapticFeedback } from '@/lib/haptics';

export default function HomeScreen() {
  const { user } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await hapticFeedback.light();
    setTimeout(() => {
      setRefreshing(false);
      hapticFeedback.success();
    }, 800);
  };

  const handleTakeoverChat = async () => {
    await hapticFeedback.medium();
    router.push('/chat/session-urgent-1');
  };

  const handleTeachAi = async () => {
    await hapticFeedback.light();
    router.push('/(tabs)/more');
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <StatusBar barStyle="light-content" />
      <ScrollView
        className="flex-1 px-4 sm:px-6 pt-3"
        contentContainerStyle={{ paddingBottom: 110 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" />
        }
      >
        {/* Top Header */}
        <View className="flex-row items-center justify-between py-3 mb-2">
          <View>
            <Text className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-400">
              GPTFORM MOBILE
            </Text>
            <Text className="text-2xl font-black text-white tracking-tight">
              Good morning, {user?.name ? user.name.split(' ')[0] : 'Deepak'} 👋
            </Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => hapticFeedback.light()}
            className="size-10 rounded-2xl bg-slate-900 border border-slate-800 items-center justify-center relative"
          >
            <Bell size={18} color="#94A3B8" />
            <View className="absolute top-2 right-2 size-2 rounded-full bg-red-500 animate-pulse" />
          </TouchableOpacity>
        </View>

        {/* ── TODAY STATS GRID ── */}
        <View className="my-2">
          <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
            Today at a Glance
          </Text>
          <View className="flex-row gap-2.5">
            {/* Leads */}
            <TouchableOpacity
              onPress={() => {
                hapticFeedback.light();
                router.push('/(tabs)/leads');
              }}
              activeOpacity={0.85}
              className="flex-1 p-3.5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm"
            >
              <View className="size-7 rounded-lg bg-emerald-500/10 items-center justify-center mb-2">
                <Target size={15} color="#10B981" />
              </View>
              <Text className="text-xl font-black text-white">3</Text>
              <Text className="text-[11px] text-slate-400 font-medium">New Leads</Text>
            </TouchableOpacity>

            {/* Chats */}
            <TouchableOpacity
              onPress={() => {
                hapticFeedback.light();
                router.push('/(tabs)/inbox');
              }}
              activeOpacity={0.85}
              className="flex-1 p-3.5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm"
            >
              <View className="size-7 rounded-lg bg-blue-500/10 items-center justify-center mb-2">
                <MessageSquare size={15} color="#3B82F6" />
              </View>
              <Text className="text-xl font-black text-white">5</Text>
              <Text className="text-[11px] text-slate-400 font-medium">Conversations</Text>
            </TouchableOpacity>

            {/* Bookings */}
            <TouchableOpacity
              onPress={() => {
                hapticFeedback.light();
                router.push('/(tabs)/bookings');
              }}
              activeOpacity={0.85}
              className="flex-1 p-3.5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm"
            >
              <View className="size-7 rounded-lg bg-purple-500/10 items-center justify-center mb-2">
                <Calendar size={15} color="#A855F7" />
              </View>
              <Text className="text-xl font-black text-white">2</Text>
              <Text className="text-[11px] text-slate-400 font-medium">Bookings</Text>
            </TouchableOpacity>

            {/* Human Request */}
            <TouchableOpacity
              onPress={handleTakeoverChat}
              activeOpacity={0.85}
              className="flex-1 p-3.5 rounded-2xl bg-red-950/40 border border-red-500/40 shadow-sm"
            >
              <View className="size-7 rounded-lg bg-red-500/20 items-center justify-center mb-2">
                <Radio size={15} color="#EF4444" />
              </View>
              <Text className="text-xl font-black text-red-400">1</Text>
              <Text className="text-[11px] text-red-300 font-bold">Waiting</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── NEEDS YOUR ATTENTION (Live Action Banners) ── */}
        <View className="mt-5">
          <View className="flex-row items-center gap-1.5 mb-2.5">
            <Zap size={14} color="#EF4444" />
            <Text className="text-[11px] font-extrabold uppercase tracking-wider text-red-400">
              Needs Your Attention Now
            </Text>
          </View>

          {/* Urgent Chat Takeover Alert Card */}
          <View className="p-4 rounded-3xl bg-slate-900 border border-red-500/40 shadow-xl space-y-3 mb-3">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <View className="size-2 rounded-full bg-red-500 animate-pulse" />
                <Text className="text-xs font-black text-white">Live Visitor Waiting for Human</Text>
              </View>
              <Text className="text-[10px] text-slate-400 font-medium">2 min ago</Text>
            </View>

            <View className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
              <Text className="text-xs text-slate-200 font-medium italic">
                “Can I speak with a real technician about an urgent boiler leak?”
              </Text>
              <Text className="text-[10px] text-slate-400 mt-1">
                From: Emergency Plumbing Form · Visitor #8412
              </Text>
            </View>

            <View className="flex-row items-center gap-2 pt-1">
              <TouchableOpacity
                onPress={handleTakeoverChat}
                className="flex-1 h-10 rounded-xl bg-red-500 active:bg-red-600 items-center justify-center flex-row gap-1.5 shadow-md shadow-red-500/20"
              >
                <Zap size={14} color="#fff" />
                <Text className="text-xs font-bold text-white">Take Over Chat</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => hapticFeedback.light()}
                className="h-10 px-4 rounded-xl bg-slate-800 items-center justify-center"
              >
                <Text className="text-xs font-medium text-slate-300">Dismiss</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* AI Knowledge Gap Alert Card */}
          <View className="p-4 rounded-3xl bg-slate-900 border border-amber-500/30 shadow-md space-y-3">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <Bot size={14} color="#F59E0B" />
                <Text className="text-xs font-bold text-amber-400">AI Knowledge Gap Detected</Text>
              </View>
              <Text className="text-[10px] text-slate-400 font-medium">18 min ago</Text>
            </View>

            <Text className="text-xs text-slate-300 font-medium">
              Customer asked: <Text className="italic font-bold text-white">“Do you service South Austin on Sunday evenings?”</Text>
            </Text>

            <TouchableOpacity
              onPress={handleTeachAi}
              className="h-9 px-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex-row items-center justify-between active:bg-amber-500/20"
            >
              <Text className="text-[11px] font-bold text-amber-300">🎙️ Teach AI Answer in 10s</Text>
              <ArrowRight size={13} color="#F59E0B" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── TODAY'S ACTIVITY FEED ── */}
        <View className="mt-6">
          <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
            Recent Activity
          </Text>

          <View className="bg-slate-900 border border-slate-800 rounded-3xl divide-y divide-slate-800/80 overflow-hidden">
            <View className="p-3.5 flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <View className="size-8 rounded-xl bg-emerald-500/10 items-center justify-center">
                  <Target size={16} color="#10B981" />
                </View>
                <View>
                  <Text className="text-xs font-bold text-white">New Lead: John Smith</Text>
                  <Text className="text-[10px] text-slate-400">AC Repair · Est. $850</Text>
                </View>
              </View>
              <Text className="text-[10px] text-slate-500 font-semibold">10:32 AM</Text>
            </View>

            <View className="p-3.5 flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <View className="size-8 rounded-xl bg-purple-500/10 items-center justify-center">
                  <Calendar size={16} color="#A855F7" />
                </View>
                <View>
                  <Text className="text-xs font-bold text-white">Appointment: Priya</Text>
                  <Text className="text-[10px] text-slate-400">Dental Consultation Booked</Text>
                </View>
              </View>
              <Text className="text-[10px] text-slate-500 font-semibold">09:14 AM</Text>
            </View>

            <View className="p-3.5 flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <View className="size-8 rounded-xl bg-blue-500/10 items-center justify-center">
                  <MessageSquare size={16} color="#3B82F6" />
                </View>
                <View>
                  <Text className="text-xs font-bold text-white">Form Submission #149</Text>
                  <Text className="text-[10px] text-slate-400">Emergency Plumbing Form</Text>
                </View>
              </View>
              <Text className="text-[10px] text-slate-500 font-semibold">08:45 AM</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
