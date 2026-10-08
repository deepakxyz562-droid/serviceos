import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Platform,
  Alert,
  Animated,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { hapticFeedback } from '@/lib/haptics';
import { apiRequest, ApiError } from '@/lib/api';
import { API_PATHS } from '@/lib/constants';

const QUICK_PROMPTS = [
  'Who owes me money (Udhaar dues)?',
  'Today’s sales and drawer cash',
  'Which items are low in stock?',
  'Show today’s leads & bookings',
  'Draft follow-ups to pending customers',
];

export function FloatingCopilot() {
  const [modalOpen, setModalOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  // Stable per-session conversationId so the backend can thread messages.
  const conversationIdRef = useRef<string | undefined>(undefined);
  // Latest chatHistory reference, used to build the messages payload right
  // before sending (avoids stale-closure issues inside handleSend).
  const chatHistoryRef = useRef<Array<{ role: 'user' | 'assistant'; text: string }>>([]);
  // handleSendRef lets the speech-recognition event listener invoke the
  // latest handleSend closure without re-subscribing on every render.
  const handleSendRef = useRef<(text?: string) => void>(() => {});
  const [chatHistory, setChatHistory] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([
    {
      role: 'assistant',
      text: 'Good morning! How can I assist with your forms, leads, or appointments today?',
    },
  ]);
  chatHistoryRef.current = chatHistory;

  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleOpen = async () => {
    await hapticFeedback.medium();
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.92,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 80,
        useNativeDriver: true,
      }),
    ]).start();
    setModalOpen(true);
  };

  const handleSend = async (customText?: string) => {
    const textToSend = (customText || prompt).trim();
    if (!textToSend || loading) return;

    await hapticFeedback.light();

    // Optimistic: append the user message immediately.
    const priorHistory = chatHistoryRef.current;
    const newHistory = [
      ...priorHistory,
      { role: 'user' as const, text: textToSend },
    ];
    setChatHistory(newHistory);
    setPrompt('');
    setLoading(true);

    try {
      // Build the messages payload expected by POST /api/ai/chat
      // (must end with a user message). The backend system prompt is
      // injected server-side — we only send the conversation history.
      const messages = newHistory.map((m) => ({
        role: m.role,
        content: m.text,
      }));

      const res = await apiRequest<{ reply?: string; error?: string }>(
        API_PATHS.aiChat,
        {
          method: 'POST',
          body: {
            messages,
            conversationId: conversationIdRef.current,
          },
        },
      );

      const reply =
        (res?.reply && res.reply.trim()) ||
        res?.error ||
        'I couldn’t generate a response. Please rephrase and try again.';

      setChatHistory((prev) => [...prev, { role: 'assistant', text: reply }]);
      await hapticFeedback.success();
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : 'Sorry, I couldn’t reach the assistant. Please try again.';
      setChatHistory((prev) => [
        ...prev,
        { role: 'assistant', text: `⚠️ ${msg}` },
      ]);
    } finally {
      setLoading(false);
    }
  };
  handleSendRef.current = handleSend;

  const toggleVoice = async () => {
    await hapticFeedback.medium();
    Alert.alert(
      'Voice Dictation',
      'You can dictate hands-free using the microphone key on your device keyboard.',
      [{ text: 'Got it' }]
    );
  };

  return (
    <>
      {/* Floating Action Button */}
      <Animated.View
        style={{
          transform: [{ scale: scaleAnim }],
          position: 'absolute',
          bottom: 85,
          right: 20,
          zIndex: 50,
        }}
      >
        <TouchableOpacity
          onPress={handleOpen}
          activeOpacity={0.85}
          className="size-14 rounded-full bg-emerald-500 items-center justify-center shadow-2xl shadow-emerald-500/50 border-2 border-emerald-300/40"
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
