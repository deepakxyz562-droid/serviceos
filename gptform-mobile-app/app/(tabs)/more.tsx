import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import {
  FileInput,
  Bot,
  Sparkles,
  Share2,
  Check,
  Pause,
  Play,
  LogOut,
  ChevronRight,
  TrendingUp,
  Brain,
  HelpCircle,
  Eye,
  ShieldCheck,
} from 'lucide-react-native';
import { useAuthStore } from '@/stores/auth-store';
import { hapticFeedback } from '@/lib/haptics';

export default function MoreScreen() {
  const { user, tenant, logout } = useAuthStore();
  const [teachingQuestion, setTeachingQuestion] = useState(
    'Do you service South Austin on Sunday evenings?'
  );
  const [aiAnswer, setAiAnswer] = useState('');
  const [taught, setTaught] = useState(false);

  const handleSaveAnswer = async () => {
    if (!aiAnswer.trim()) return;
    await hapticFeedback.success();
    setTaught(true);
    setTimeout(() => {
      setTaught(false);
      setAiAnswer('');
    }, 2500);
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of GPTForm?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await hapticFeedback.medium();
          logout();
        },
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <StatusBar barStyle="light-content" />
      <ScrollView
        className="flex-1 px-4 sm:px-6 pt-3"
        contentContainerStyle={{ paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="py-2 mb-2">
          <Text className="text-2xl font-black text-white tracking-tight">Studio Monitor</Text>
          <Text className="text-xs text-slate-400 mt-0.5">
            Forms Health, AI Agents, and Knowledge Training
          </Text>
        </View>

        {/* ── 1. FORMS PERFORMANCE ── */}
        <View className="mb-6">
          <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
            Active Forms (3)
          </Text>

          <View className="space-y-3">
            {[
              {
                id: 'f1',
                title: 'Emergency Plumbing Intake',
                views: 1203,
                submissions: 87,
                rate: '7.2%',
                status: 'published',
              },
              {
                id: 'f2',
                title: 'HVAC Seasonal Inspection',
                views: 892,
                submissions: 61,
                rate: '6.8%',
                status: 'published',
              },
              {
                id: 'f3',
                title: 'Dental Consultation Booking',
                views: 421,
                submissions: 38,
                rate: '9.0%',
                status: 'published',
              },
            ].map((form) => (
              <View
                key={form.id}
                className="p-4 rounded-3xl bg-slate-900 border border-slate-800 space-y-3 shadow-sm"
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2">
                    <View className="size-8 rounded-xl bg-emerald-500/10 items-center justify-center">
                      <FileInput size={16} color="#10B981" />
                    </View>
                    <Text className="text-sm font-bold text-white">{form.title}</Text>
                  </View>
                  <View className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
                    <Text className="text-[9px] font-bold text-emerald-400 uppercase">Active</Text>
                  </View>
                </View>

                {/* Metrics */}
                <View className="flex-row justify-between py-2 px-3 rounded-2xl bg-slate-950 border border-slate-800/80">
                  <View className="items-center">
                    <Text className="text-[10px] text-slate-400 font-medium">Views</Text>
                    <Text className="text-xs font-bold text-white mt-0.5">{form.views}</Text>
                  </View>
                  <View className="items-center">
                    <Text className="text-[10px] text-slate-400 font-medium">Submissions</Text>
                    <Text className="text-xs font-bold text-white mt-0.5">{form.submissions}</Text>
                  </View>
                  <View className="items-center">
                    <Text className="text-[10px] text-slate-400 font-medium">Conversion</Text>
                    <Text className="text-xs font-black text-emerald-400 mt-0.5">{form.rate}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ── 2. AI AGENTS HEALTH & TEACH AI ── */}
        <View className="mb-6">
          <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
            AI Agent &amp; Knowledge Base
          </Text>

          {/* AI Stats Pill */}
          <View className="p-4 rounded-3xl bg-slate-900 border border-slate-800 mb-3 flex-row items-center justify-between">
            <View className="flex-row items-center gap-2.5">
              <View className="size-9 rounded-2xl bg-blue-500/10 items-center justify-center">
                <Bot size={18} color="#3B82F6" />
              </View>
              <View>
                <Text className="text-xs font-bold text-white">AI Employee Agent</Text>
                <Text className="text-[10px] text-emerald-400 font-semibold">● 94% Resolution Rate</Text>
              </View>
            </View>
            <View className="items-end">
              <Text className="text-xs font-bold text-slate-300">126 Conversations</Text>
              <Text className="text-[10px] text-slate-500">Last 7 days</Text>
            </View>
          </View>

          {/* 10-Second Teach AI Card */}
          <View className="p-4 rounded-3xl bg-slate-900 border border-amber-500/30 space-y-3">
            <View className="flex-row items-center gap-2">
              <Brain size={16} color="#F59E0B" />
              <Text className="text-xs font-black text-amber-400">Teach AI in 10 Seconds</Text>
            </View>

            <View className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
              <Text className="text-[10px] text-slate-400 uppercase font-bold mb-1">
                Unanswered Customer Question:
              </Text>
              <Text className="text-xs font-semibold text-white italic">
                “{teachingQuestion}”
              </Text>
            </View>

            {taught ? (
              <View className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex-row items-center gap-2">
                <Check size={16} color="#10B981" />
                <Text className="text-xs font-bold text-emerald-400">
                  Learned! Knowledge base updated across all channels.
                </Text>
              </View>
            ) : (
              <View className="space-y-2">
                <TextInput
                  value={aiAnswer}
                  onChangeText={setAiAnswer}
                  placeholder="e.g. Yes, we provide 24/7 emergency service in South Austin."
                  placeholderTextColor="#64748B"
                  className="bg-slate-950 border border-slate-800 rounded-2xl p-3 text-xs text-white"
                />
                <TouchableOpacity
                  onPress={handleSaveAnswer}
                  disabled={!aiAnswer.trim()}
                  className={`h-10 rounded-2xl items-center justify-center flex-row gap-1.5 ${
                    aiAnswer.trim() ? 'bg-amber-500 active:bg-amber-600' : 'bg-slate-800'
                  }`}
                >
                  <Sparkles size={14} color={aiAnswer.trim() ? '#022C22' : '#64748B'} />
                  <Text
                    className={`text-xs font-bold ${
                      aiAnswer.trim() ? 'text-slate-950 font-black' : 'text-slate-400'
                    }`}
                  >
                    Teach Agent Answer
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* ── 3. ACCOUNT & SIGN OUT ── */}
        <View className="p-4 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
          <View className="flex-row items-center justify-between pb-2 border-b border-slate-800">
            <View>
              <Text className="text-xs font-bold text-white">{user?.name || 'Deepak Chandra'}</Text>
              <Text className="text-[10px] text-slate-400">{user?.email || 'deepak@fieseros.com'}</Text>
            </View>
            <View className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
              <Text className="text-[9px] font-bold text-emerald-400 uppercase">
                {tenant?.plan || 'PRO'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleLogout}
            className="flex-row items-center justify-between py-2"
          >
            <View className="flex-row items-center gap-2">
              <LogOut size={16} color="#EF4444" />
              <Text className="text-xs font-bold text-red-400">Sign Out</Text>
            </View>
            <ChevronRight size={16} color="#64748B" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
