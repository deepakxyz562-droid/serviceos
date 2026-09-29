import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Linking,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import {
  X,
  Phone,
  MessageCircle,
  Mail,
  Target,
  Sparkles,
  CheckCircle2,
  Calendar,
  MapPin,
  Clock,
} from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { hapticFeedback } from '@/lib/haptics';

export default function LeadDetailModal() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const handleCall = () => {
    hapticFeedback.medium();
    Linking.openURL('tel:+15125550192');
  };

  const handleWhatsApp = () => {
    hapticFeedback.medium();
    Linking.openURL('whatsapp://send?phone=15125550192&text=Hi%20John');
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <StatusBar barStyle="light-content" />
      <View className="flex-1 px-4 sm:px-6 pt-3">
        {/* Top Header */}
        <View className="flex-row items-center justify-between pb-3 border-b border-slate-800">
          <View>
            <Text className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
              Lead Dossier
            </Text>
            <Text className="text-xl font-black text-white">John Smith</Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              hapticFeedback.light();
              router.back();
            }}
            className="size-8 rounded-full bg-slate-800 items-center justify-center"
          >
            <X size={16} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 my-4 space-y-4" showsVerticalScrollIndicator={false}>
          {/* Quick Actions Row */}
          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={handleCall}
              className="flex-1 h-11 rounded-2xl bg-emerald-500 flex-row items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20"
            >
              <Phone size={15} color="#022C22" />
              <Text className="text-xs font-black text-slate-950">Call Now</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleWhatsApp}
              className="flex-1 h-11 rounded-2xl bg-slate-900 border border-teal-500/40 flex-row items-center justify-center gap-1.5"
            >
              <MessageCircle size={15} color="#14B8A6" />
              <Text className="text-xs font-bold text-teal-300">WhatsApp</Text>
            </TouchableOpacity>
          </View>

          {/* AI Qualification Card */}
          <View className="p-4 rounded-3xl bg-slate-900 border border-emerald-500/30 space-y-2.5">
            <View className="flex-row items-center gap-2">
              <Sparkles size={16} color="#10B981" />
              <Text className="text-xs font-black text-white">AI Qualification Summary</Text>
            </View>
            <Text className="text-xs text-slate-300 leading-relaxed font-medium">
              High intent prospect. Resident in Central Austin, reported heat pump blowing warm air. Willing to pay diagnostic fee of $89 and requested early morning emergency visit tomorrow.
            </Text>
          </View>

          {/* Form Answers Grid */}
          <View className="p-4 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
            <Text className="text-xs font-bold text-white uppercase tracking-wider">
              Intake Form Data
            </Text>

            <View className="space-y-2 text-xs">
              <View className="flex-row justify-between py-1.5 border-b border-slate-800">
                <Text className="text-slate-400">Service Type:</Text>
                <Text className="font-bold text-white">HVAC Compressor Repair</Text>
              </View>

              <View className="flex-row justify-between py-1.5 border-b border-slate-800">
                <Text className="text-slate-400">Location:</Text>
                <Text className="font-bold text-white">Austin, TX 78701</Text>
              </View>

              <View className="flex-row justify-between py-1.5 border-b border-slate-800">
                <Text className="text-slate-400">Preferred Date:</Text>
                <Text className="font-bold text-white">Tomorrow (09:00 - 11:00 AM)</Text>
              </View>

              <View className="flex-row justify-between py-1.5">
                <Text className="text-slate-400">Estimated Value:</Text>
                <Text className="font-black text-emerald-400 text-sm">$850.00</Text>
              </View>
            </View>
          </View>

          {/* Stage Progression Action */}
          <View className="pt-2">
            <TouchableOpacity
              onPress={async () => {
                await hapticFeedback.success();
                router.back();
              }}
              className="h-12 rounded-2xl bg-emerald-600 active:bg-emerald-700 items-center justify-center flex-row gap-2"
            >
              <CheckCircle2 size={16} color="#fff" />
              <Text className="text-xs font-bold text-white">Mark as Contacted &amp; Won</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
