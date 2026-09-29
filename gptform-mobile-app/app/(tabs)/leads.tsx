import React, { useState } from 'react';
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
  Phone,
  MessageCircle,
  Mail,
  Target,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  DollarSign,
  Clock,
  ChevronRight,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { hapticFeedback } from '@/lib/haptics';

interface DemoLead {
  id: string;
  name: string;
  phone: string;
  email: string;
  service: string;
  source: 'ai_agent' | 'form' | 'chat';
  status: 'new' | 'contacted' | 'won';
  estimatedValue: number;
  time: string;
  summary: string;
}

const MOCK_LEADS: DemoLead[] = [
  {
    id: 'lead-1',
    name: 'John Smith',
    phone: '+15125550192',
    email: 'john.smith@gmail.com',
    service: 'HVAC Compressor Repair',
    source: 'ai_agent',
    status: 'new',
    estimatedValue: 850,
    time: 'Today · 10:32 AM',
    summary: 'Qualified by AI: 3-bedroom home, AC blowing warm air, wants technician tomorrow morning.',
  },
  {
    id: 'lead-2',
    name: 'Sarah Jones',
    phone: '+15125550143',
    email: 'sarah.j@outlook.com',
    service: 'Dental Routine Checkup',
    source: 'form',
    status: 'new',
    estimatedValue: 200,
    time: 'Today · 09:15 AM',
    summary: 'Submitted via Dental Consultation Form with preferred Friday afternoon slot.',
  },
  {
    id: 'lead-3',
    name: 'Michael Chang',
    phone: '+15125550188',
    email: 'm.chang@techcorp.com',
    service: 'Roof Shingle Inspection',
    source: 'ai_agent',
    status: 'contacted',
    estimatedValue: 3400,
    time: 'Yesterday · 16:40 PM',
    summary: 'Storm damage inspection request after hail storm. Quoted estimate range $3K-$4K.',
  },
  {
    id: 'lead-4',
    name: 'David Miller',
    phone: '+15125550119',
    email: 'david.m@yahoo.com',
    service: 'Emergency Drain Unclogging',
    source: 'chat',
    status: 'won',
    estimatedValue: 450,
    time: 'Yesterday · 11:20 AM',
    summary: 'Booked and paid $50 deposit via Stripe. Job completed.',
  },
];

export default function LeadsScreen() {
  const [selectedStatus, setSelectedStatus] = useState<'new' | 'contacted' | 'won'>('new');

  const filteredLeads = MOCK_LEADS.filter((l) => l.status === selectedStatus);

  const handleCall = async (phone: string) => {
    await hapticFeedback.medium();
    Linking.openURL(`tel:${phone}`);
  };

  const handleWhatsApp = async (phone: string, name: string) => {
    await hapticFeedback.medium();
    const clean = phone.replace(/[^0-9]/g, '');
    const msg = encodeURIComponent(`Hi ${name}, this is Deepak from GPTForm following up on your inquiry.`);
    Linking.openURL(`whatsapp://send?phone=${clean}&text=${msg}`);
  };

  const handleOpenLead = async (id: string) => {
    await hapticFeedback.light();
    router.push(`/lead/${id}`);
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <StatusBar barStyle="light-content" />
      <View className="flex-1 px-4 sm:px-6 pt-3">
        {/* Header */}
        <View className="py-2 mb-2">
          <Text className="text-2xl font-black text-white tracking-tight">Leads Pipeline</Text>
          <Text className="text-xs text-slate-400 mt-0.5">
            Capture, qualify, and convert from phone &amp; WhatsApp
          </Text>
        </View>

        {/* Pipeline Tabs */}
        <View className="flex-row p-1 bg-slate-900 border border-slate-800 rounded-2xl mb-4">
          {[
            { id: 'new', label: '🔥 New', count: 2 },
            { id: 'contacted', label: 'Contacted', count: 1 },
            { id: 'won', label: 'Won', count: 1 },
          ].map((tab) => {
            const active = selectedStatus === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={async () => {
                  await hapticFeedback.light();
                  setSelectedStatus(tab.id as any);
                }}
                className={`flex-1 py-2 rounded-xl items-center justify-center flex-row gap-1.5 ${
                  active ? 'bg-emerald-500' : 'bg-transparent'
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    active ? 'text-slate-950 font-black' : 'text-slate-400'
                  }`}
                >
                  {tab.label}
                </Text>
                <View
                  className={`px-1.5 py-0.2 rounded-full ${
                    active ? 'bg-slate-950/20' : 'bg-slate-800'
                  }`}
                >
                  <Text
                    className={`text-[10px] font-bold ${
                      active ? 'text-slate-950' : 'text-slate-400'
                    }`}
                  >
                    {tab.count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Leads Cards */}
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 110 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="space-y-3">
            {filteredLeads.map((lead) => (
              <View
                key={lead.id}
                className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-md space-y-3"
              >
                <TouchableOpacity
                  onPress={() => handleOpenLead(lead.id)}
                  activeOpacity={0.8}
                  className="flex-row items-center justify-between"
                >
                  <View>
                    <Text className="text-base font-bold text-white">{lead.name}</Text>
                    <Text className="text-xs text-emerald-400 font-semibold mt-0.5">
                      {lead.service}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-sm font-black text-white">
                      ${lead.estimatedValue}
                    </Text>
                    <Text className="text-[10px] text-slate-500 font-medium">{lead.time}</Text>
                  </View>
                </TouchableOpacity>

                {/* AI Summary Quote */}
                <View className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80">
                  <Text className="text-xs text-slate-300 font-medium leading-relaxed">
                    {lead.summary}
                  </Text>
                </View>

                {/* 1-Tap CRM Quick Actions */}
                <View className="flex-row items-center gap-2 pt-1 border-t border-slate-800/80">
                  <TouchableOpacity
                    onPress={() => handleCall(lead.phone)}
                    className="flex-1 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex-row items-center justify-center gap-1.5 active:bg-emerald-500/20"
                  >
                    <Phone size={13} color="#10B981" />
                    <Text className="text-xs font-bold text-emerald-400">Call</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleWhatsApp(lead.phone, lead.name)}
                    className="flex-1 h-9 rounded-xl bg-teal-500/10 border border-teal-500/30 flex-row items-center justify-center gap-1.5 active:bg-teal-500/20"
                  >
                    <MessageCircle size={13} color="#14B8A6" />
                    <Text className="text-xs font-bold text-teal-300">WhatsApp</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleOpenLead(lead.id)}
                    className="size-9 rounded-xl bg-slate-800 items-center justify-center"
                  >
                    <ChevronRight size={16} color="#94A3B8" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
