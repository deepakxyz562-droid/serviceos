import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import {
  ArrowLeft,
  Zap,
  Send,
  Sparkles,
  Bot,
  User,
  Phone,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { hapticFeedback } from '@/lib/haptics';

interface Message {
  id: string;
  sender: 'ai' | 'visitor' | 'operator' | 'system';
  text: string;
  time: string;
}

export default function ChatDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [operatorClaimed, setOperatorClaimed] = useState(false);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'm1',
      sender: 'ai',
      text: 'Hello! I am your 24/7 assistant. How can I help with your plumbing inquiry today?',
      time: '10:30 AM',
    },
    {
      id: 'm2',
      sender: 'visitor',
      text: 'I have an emergency burst pipe in my basement. Water is spreading fast.',
      time: '10:31 AM',
    },
    {
      id: 'm3',
      sender: 'ai',
      text: 'I understand this is urgent! We have technicians on standby. What is your postal code and phone number?',
      time: '10:31 AM',
    },
    {
      id: 'm4',
      sender: 'visitor',
      text: 'Can I speak with a real technician right now please?',
      time: '10:32 AM',
    },
    {
      id: 'm5',
      sender: 'system',
      text: '⚠️ Human operator assistance requested by visitor.',
      time: '10:32 AM',
    },
  ]);

  const handleClaim = async () => {
    await hapticFeedback.success();
    setOperatorClaimed(true);
    setMessages((prev) => [
      ...prev,
      {
        id: `m-${Date.now()}`,
        sender: 'system',
        text: '⚡ Operator Deepak Chandra joined the conversation.',
        time: 'Just now',
      },
      {
        id: `m-${Date.now() + 1}`,
        sender: 'operator',
        text: 'Hi Sarah, I am here! First please turn off the main water shutoff valve. Where are you located?',
        time: 'Just now',
      },
    ]);
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;
    await hapticFeedback.light();
    setMessages((prev) => [
      ...prev,
      {
        id: `m-${Date.now()}`,
        sender: 'operator',
        text: inputText.trim(),
        time: 'Just now',
      },
    ]);
    setInputText('');
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        {/* Top Header */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900">
          <View className="flex-row items-center gap-3">
            <TouchableOpacity
              onPress={() => {
                hapticFeedback.light();
                router.back();
              }}
              className="size-9 rounded-xl bg-slate-800 items-center justify-center"
            >
              <ArrowLeft size={18} color="#94A3B8" />
            </TouchableOpacity>

            <View>
              <Text className="text-sm font-bold text-white">Sarah Jenkins</Text>
              <Text className="text-[10px] text-emerald-400 font-semibold">
                {operatorClaimed ? '● Live with Operator' : '🔴 Human Requested'}
              </Text>
            </View>
          </View>

          {!operatorClaimed && (
            <TouchableOpacity
              onPress={handleClaim}
              className="h-8 px-3 rounded-xl bg-red-500 active:bg-red-600 flex-row items-center gap-1.5 shadow-md shadow-red-500/20"
            >
              <Zap size={13} color="#fff" />
              <Text className="text-[11px] font-bold text-white">Take Over</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Message Stream */}
        <ScrollView
          className="flex-1 px-4 py-4 space-y-3"
          contentContainerStyle={{ paddingBottom: 20 }}
        >
          {messages.map((msg) => {
            if (msg.sender === 'system') {
              return (
                <View key={msg.id} className="py-2 items-center">
                  <View className="px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800">
                    <Text className="text-[10px] font-semibold text-amber-400">{msg.text}</Text>
                  </View>
                </View>
              );
            }

            const isVisitor = msg.sender === 'visitor';
            const isOperator = msg.sender === 'operator';

            return (
              <View
                key={msg.id}
                className={`max-w-[80%] rounded-2xl p-3.5 ${
                  isVisitor
                    ? 'bg-slate-900 border border-slate-800 mr-auto'
                    : isOperator
                    ? 'bg-emerald-600 ml-auto'
                    : 'bg-blue-950/60 border border-blue-800/40 ml-auto'
                }`}
              >
                <View className="flex-row items-center justify-between gap-3 mb-1">
                  <Text
                    className={`text-[10px] font-extrabold uppercase tracking-wider ${
                      isVisitor ? 'text-slate-400' : isOperator ? 'text-emerald-200' : 'text-blue-300'
                    }`}
                  >
                    {isVisitor ? 'Visitor' : isOperator ? 'You (Operator)' : 'AI Agent'}
                  </Text>
                  <Text
                    className={`text-[9px] ${
                      isVisitor ? 'text-slate-500' : isOperator ? 'text-emerald-300' : 'text-blue-400'
                    }`}
                  >
                    {msg.time}
                  </Text>
                </View>
                <Text
                  className={`text-xs leading-relaxed ${
                    isOperator ? 'text-white font-medium' : 'text-slate-100'
                  }`}
                >
                  {msg.text}
                </Text>
              </View>
            );
          })}
        </ScrollView>

        {/* Operator Input Bar */}
        <View className="p-3 border-t border-slate-800 bg-slate-900 flex-row items-center gap-2">
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder={
              operatorClaimed ? 'Reply directly as operator...' : 'Claim to reply to visitor...'
            }
            placeholderTextColor="#64748B"
            className="flex-1 h-11 bg-slate-950 border border-slate-800 rounded-2xl px-4 text-xs text-white"
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={!inputText.trim()}
            className={`size-11 rounded-2xl items-center justify-center ${
              inputText.trim() ? 'bg-emerald-500' : 'bg-slate-800'
            }`}
          >
            <Send size={16} color={inputText.trim() ? '#022C22' : '#64748B'} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
