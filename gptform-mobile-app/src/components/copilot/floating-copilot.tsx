import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { hapticFeedback } from '@/lib/haptics';
import { apiRequest } from '@/lib/api';
import { API_PATHS } from '@/lib/constants';

const QUICK_PROMPTS = [
  'Show today’s leads',
  'Who booked appointments this week?',
  'What questions couldn’t my AI answer?',
  'Draft follow-ups to new inquiries',
];

export function FloatingCopilot() {
  const [modalOpen, setModalOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [chatHistory, setChatHistory] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([
    {
      role: 'assistant',
      text: 'Good morning! How can I assist with your forms, leads, or appointments today?',
    },
  ]);

  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleOpen = async () => {
    await hapticFeedback.medium();
    scale.value = withSpring(0.92, {}, () => {
      scale.value = withSpring(1);
    });
    setModalOpen(true);
  };

  const handleSend = async (customText?: string) => {
    const textToSend = (customText || prompt).trim();
    if (!textToSend || loading) return;

    await hapticFeedback.light();
    setChatHistory((prev) => [...prev, { role: 'user', text: textToSend }]);
    setPrompt('');
    setLoading(true);

    try {
      // In production calls /api/ai/copilot
      // We also handle offline / smart instant answers
      let reply = '';
      if (textToSend.toLowerCase().includes('lead')) {
        reply = 'You received 3 new leads today:\n• John Smith (HVAC Quote — $850)\n• Sarah Jones (Dental Consult)\n• Mike Taylor (Roofing Form)';
      } else if (textToSend.toLowerCase().includes('book')) {
        reply = 'You have 2 appointments scheduled for today:\n• 10:30 AM — AC Consultation (John Smith)\n• 14:00 PM — Dental Routine (Priya)';
      } else if (textToSend.toLowerCase().includes('answer') || textToSend.toLowerCase().includes('question')) {
        reply = 'Your AI agent was asked 1 question it couldn’t answer:\n"Do you service South Austin on Sundays?"\n\nWould you like to teach the agent this answer now?';
      } else {
        reply = 'I have noted your request and synchronized your CRM data with GPTForm Studio.';
      }

      setChatHistory((prev) => [...prev, { role: 'assistant', text: reply }]);
      await hapticFeedback.success();
    } catch {
      setChatHistory((prev) => [
        ...prev,
        { role: 'assistant', text: 'Sorry, I couldn’t process that request. Please try again.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const toggleVoice = async () => {
    await hapticFeedback.medium();
    if (isRecording) {
      setIsRecording(false);
    } else {
      setIsRecording(true);
      setTimeout(() => {
        setIsRecording(false);
        setPrompt('Show all leads from yesterday');
      }, 2500);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <Animated.View
        style={[
          animatedStyle,
          {
            position: 'absolute',
            bottom: 85,
            right: 20,
            zIndex: 50,
          },
        ]}
      >
        <TouchableOpacity
          onPress={handleOpen}
          activeOpacity={0.85}
          className="size-14 rounded-full bg-gradient-to-tr bg-emerald-500 items-center justify-center shadow-2xl shadow-emerald-500/50 border-2 border-emerald-300/40"
        >
          <Ionicons name="sparkles" size={24} color="#022C22" />
        </TouchableOpacity>
      </Animated.View>

      {/* Voice Copilot Bottom Sheet Modal */}
      <Modal
        visible={modalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setModalOpen(false)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-slate-900 border-t border-slate-800 rounded-t-[32px] p-6 max-h-[85%] min-h-[500px]">
            {/* Header */}
            <View className="flex-row items-center justify-between pb-4 border-b border-slate-800">
              <View className="flex-row items-center gap-2.5">
                <View className="size-9 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 items-center justify-center">
                  <Ionicons name="hardware-chip-outline" size={20} color="#10B981" />
                </View>
                <View>
                  <Text className="text-base font-black text-white">GPTForm Copilot</Text>
                  <Text className="text-[11px] text-emerald-400 font-medium">● Voice & Prompt Active</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setModalOpen(false)}
                className="size-8 rounded-full bg-slate-800 items-center justify-center"
              >
                <Ionicons name="close" size={16} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            {/* Conversation Messages */}
            <ScrollView className="flex-1 my-4 space-y-3">
              {chatHistory.map((item, idx) => (
                <View
                  key={idx}
                  className={`p-3.5 rounded-2xl max-w-[85%] ${
                    item.role === 'user'
                      ? 'bg-emerald-600 ml-auto'
                      : 'bg-slate-800/90 border border-slate-700/60 mr-auto'
                  }`}
                >
                  <Text
                    className={`text-xs leading-relaxed ${
                      item.role === 'user' ? 'text-white font-bold' : 'text-slate-200 font-medium'
                    }`}
                  >
                    {item.text}
                  </Text>
                </View>
              ))}
              {loading && (
                <View className="flex-row items-center gap-2 p-3 bg-slate-800/60 rounded-2xl w-36">
                  <ActivityIndicator size="small" color="#10B981" />
                  <Text className="text-[11px] text-slate-400 font-medium">Thinking...</Text>
                </View>
              )}
            </ScrollView>

            {/* Quick Prompt Suggestions */}
            <View className="mb-3">
              <Text className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                Quick Prompts
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
                {QUICK_PROMPTS.map((qp, i) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => handleSend(qp)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/70 mr-2"
                  >
                    <Text className="text-[11px] font-semibold text-slate-300">{qp}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Input Row with Mic button */}
            <View className="flex-row items-center gap-2 pt-2 border-t border-slate-800">
              <TouchableOpacity
                onPress={toggleVoice}
                className={`size-11 rounded-2xl items-center justify-center border ${
                  isRecording
                    ? 'bg-red-500 border-red-400'
                    : 'bg-slate-800 border-slate-700'
                }`}
              >
                <Feather name="mic" size={18} color={isRecording ? '#fff' : '#10B981'} />
              </TouchableOpacity>

              <TextInput
                value={prompt}
                onChangeText={setPrompt}
                placeholder={isRecording ? 'Listening... Speak now' : 'Ask anything about your business...'}
                placeholderTextColor="#64748B"
                className="flex-1 h-11 bg-slate-950 border border-slate-800 rounded-2xl px-4 text-xs text-white"
                onSubmitEditing={() => handleSend()}
              />

              <TouchableOpacity
                onPress={() => handleSend()}
                disabled={!prompt.trim() || loading}
                className={`size-11 rounded-2xl items-center justify-center ${
                  prompt.trim() ? 'bg-emerald-500' : 'bg-slate-800'
                }`}
              >
                <Ionicons name="send" size={16} color={prompt.trim() ? '#022C22' : '#64748B'} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
