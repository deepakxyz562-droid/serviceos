import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Share,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  Sparkles,
  Wrench,
  User,
  TrendingUp,
  HelpCircle,
  Copy,
  X,
  FileText,
  Send,
  Zap,
} from 'lucide-react-native';
import { Modal } from '@/components/ui/Modal';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { COLORS } from '@/lib/constants';
import { api } from '@/lib/api';

type CopilotTab = 'troubleshoot' | 'history' | 'upsell' | 'ask';

interface FieldCopilotModalProps {
  visible: boolean;
  onClose: () => void;
  jobId?: string | null;
  jobTitle?: string | null;
  customerName?: string | null;
  onApplyNotes?: (notes: string) => void;
}

const UNIVERSAL_TRADE_CHIPS = [
  '⚡ Electrical & breaker safety',
  '🚰 Plumbing pipe & leak checks',
  '❄️ HVAC diagnostic steps',
  '🧹 Cleaning & surface dilution',
  '🌿 Landscaping & irrigation',
  '🐜 Pest control chemical rules',
];

export function FieldCopilotModal({
  visible,
  onClose,
  jobId,
  jobTitle,
  customerName,
  onApplyNotes,
}: FieldCopilotModalProps) {
  const { show } = useToast();
  const [activeTab, setActiveTab] = useState<CopilotTab>(jobId ? 'troubleshoot' : 'ask');
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultText, setResultText] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setActiveTab(jobId ? 'troubleshoot' : 'ask');
      setQuestion('');
      setResultText(null);
    }
  }, [visible, jobId]);

  const fetchAiInsight = async (action: 'troubleshoot' | 'summarize_customer' | 'upsell' | 'ask', q?: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setLoading(true);
    setResultText(null);

    try {
      const res = await api.post<{ text?: string; error?: string }>('/api/ai/field-assistant', {
        jobId: jobId || undefined,
        action,
        question: q,
      });

      if (res && res.text) {
        setResultText(res.text);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } else {
        show(res?.error || 'AI service unavailable. Please try again.', 'error');
      }
    } catch (err: any) {
      console.warn('FieldCopilot error:', err);
      show(err?.message || 'Could not fetch AI advice. Check connection.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTab = (tab: CopilotTab) => {
    setActiveTab(tab);
    if (!jobId) return;

    if (tab === 'troubleshoot') {
      fetchAiInsight('troubleshoot');
    } else if (tab === 'history') {
      fetchAiInsight('summarize_customer');
    } else if (tab === 'upsell') {
      fetchAiInsight('upsell');
    }
  };

  const handleAskQuestion = (overrideQuestion?: string) => {
    const q = (overrideQuestion ?? question).trim();
    if (!q) return;
    fetchAiInsight('ask', q);
  };

  const handleShareResult = async () => {
    if (!resultText) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    try {
      await Share.share({
        message: resultText,
        title: `AI Copilot — ${jobTitle || 'Field Assistant'}`,
      });
    } catch {}
  };

  const handleApplyToNotes = () => {
    if (!resultText || !onApplyNotes) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    onApplyNotes(resultText);
    show('Applied AI advice to Job Notes ✓', 'success');
    onClose();
  };

  return (
    <Modal visible={visible} onClose={onClose} position="bottom">
      <ScrollView className="max-h-[82vh] px-1 pb-4" showsVerticalScrollIndicator={false}>
        {/* Title bar */}
        <View className="flex-row items-center justify-between mb-3 px-1">
          <View className="flex-row items-center gap-2">
            <View className="size-7 rounded-lg bg-emerald-600 items-center justify-center">
              <Sparkles size={16} color="#ffffff" />
            </View>
            <View>
              <Text className="text-base font-bold text-slate-900">Universal Field Copilot</Text>
              <Text className="text-[10px] text-emerald-700 font-semibold">ALL TRADES & SERVICES</Text>
            </View>
          </View>
          <Pressable onPress={onClose} hitSlop={10} className="p-1">
            <X size={18} color="#64748B" />
          </Pressable>
        </View>

        {/* Header summary badge if job is active */}
        {jobId && (
          <View className="flex-row items-center justify-between p-3 mb-3 bg-emerald-50 rounded-xl border border-emerald-100">
            <View className="flex-row items-center gap-2 flex-1">
              <View className="flex-1">
                <Text className="text-xs font-bold text-slate-800" numberOfLines={1}>
                  {jobTitle || 'Active Job'}
                </Text>
                <Text className="text-[11px] text-slate-500">
                  Customer: {customerName || 'Client'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Quick Action Chips when a job is loaded */}
        {jobId ? (
          <View className="flex-row gap-2 mb-3">
            <Pressable
              onPress={() => handleSelectTab('troubleshoot')}
              disabled={loading}
              className={`flex-1 py-2.5 px-2 rounded-xl border items-center justify-center flex-row gap-1.5 ${
                activeTab === 'troubleshoot'
                  ? 'bg-emerald-600 border-emerald-600'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <Wrench size={13} color={activeTab === 'troubleshoot' ? '#ffffff' : '#475569'} />
              <Text
                className={`text-xs font-semibold ${
                  activeTab === 'troubleshoot' ? 'text-white' : 'text-slate-700'
                }`}
              >
                Troubleshoot
              </Text>
            </Pressable>

            <Pressable
              onPress={() => handleSelectTab('history')}
              disabled={loading}
              className={`flex-1 py-2.5 px-2 rounded-xl border items-center justify-center flex-row gap-1.5 ${
                activeTab === 'history'
                  ? 'bg-emerald-600 border-emerald-600'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <User size={13} color={activeTab === 'history' ? '#ffffff' : '#475569'} />
              <Text
                className={`text-xs font-semibold ${
                  activeTab === 'history' ? 'text-white' : 'text-slate-700'
                }`}
              >
                Recap
              </Text>
            </Pressable>

            <Pressable
              onPress={() => handleSelectTab('upsell')}
              disabled={loading}
              className={`flex-1 py-2.5 px-2 rounded-xl border items-center justify-center flex-row gap-1.5 ${
                activeTab === 'upsell'
                  ? 'bg-emerald-600 border-emerald-600'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <TrendingUp size={13} color={activeTab === 'upsell' ? '#ffffff' : '#475569'} />
              <Text
                className={`text-xs font-semibold ${
                  activeTab === 'upsell' ? 'text-white' : 'text-slate-700'
                }`}
              >
                Upsell
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setActiveTab('ask')}
              disabled={loading}
              className={`py-2.5 px-3 rounded-xl border items-center justify-center flex-row gap-1.5 ${
                activeTab === 'ask'
                  ? 'bg-emerald-600 border-emerald-600'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <HelpCircle size={13} color={activeTab === 'ask' ? '#ffffff' : '#475569'} />
              <Text
                className={`text-xs font-semibold ${
                  activeTab === 'ask' ? 'text-white' : 'text-slate-700'
                }`}
              >
                Ask
              </Text>
            </Pressable>
          </View>
        ) : null}

        {/* Free-form Question Input */}
        {(activeTab === 'ask' || !jobId) && (
          <View className="mb-3">
            <View className="flex-row items-center border border-slate-300 rounded-xl bg-white px-3 py-1 shadow-xs">
              <TextInput
                value={question}
                onChangeText={setQuestion}
                placeholder="Ask about diagnostics, dilution, wiring, safety..."
                placeholderTextColor="#94a3b8"
                className="flex-1 text-xs py-2 text-slate-800"
                onSubmitEditing={() => handleAskQuestion()}
                returnKeyType="send"
              />
              <Pressable
                onPress={() => handleAskQuestion()}
                disabled={!question.trim() || loading}
                className="p-1.5 rounded-lg bg-emerald-600 active:opacity-70"
              >
                <Send size={14} color="#ffffff" />
              </Pressable>
            </View>

            {/* Quick multi-trade suggestions */}
            {!resultText && (
              <View className="mt-3">
                <Text className="text-[11px] font-semibold text-slate-500 mb-1.5">
                  Popular trade questions:
                </Text>
                <View className="flex-row flex-wrap gap-1.5">
                  {UNIVERSAL_TRADE_CHIPS.map((chip, idx) => (
                    <Pressable
                      key={idx}
                      onPress={() => {
                        const clean = chip.replace(/^[^\s]+\s+/, '');
                        setQuestion(`How to handle ${clean}?`);
                        handleAskQuestion(`How to handle ${clean}?`);
                      }}
                      className="px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 active:bg-slate-200"
                    >
                      <Text className="text-[11px] text-slate-700 font-medium">{chip}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {/* Loading Spinner */}
        {loading && (
          <View className="py-10 items-center justify-center">
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text className="text-xs font-medium text-slate-500 mt-2.5">
              Analyzing trade advice & diagnostic standards...
            </Text>
          </View>
        )}

        {/* AI Result Card */}
        {!loading && resultText && (
          <Card className="p-4 mb-3 bg-slate-50/80 border-slate-200">
            <Text className="text-xs text-slate-800 leading-relaxed font-normal">
              {resultText}
            </Text>

            {/* Action Buttons */}
            <View className="flex-row items-center justify-end gap-2 mt-4 pt-3 border-t border-slate-200">
              <Pressable
                onPress={handleShareResult}
                className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 active:bg-slate-50"
              >
                <Copy size={13} color="#475569" />
                <Text className="text-xs font-medium text-slate-700">Share</Text>
              </Pressable>

              {onApplyNotes && (
                <Pressable
                  onPress={handleApplyToNotes}
                  className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 active:bg-emerald-700"
                >
                  <FileText size={13} color="#ffffff" />
                  <Text className="text-xs font-semibold text-white">Apply to Notes</Text>
                </Pressable>
              )}
            </View>
          </Card>
        )}

        {/* Empty prompt when no result yet on job screen */}
        {!loading && !resultText && activeTab !== 'ask' && jobId && (
          <View className="py-8 items-center justify-center">
            <Text className="text-xs text-slate-400 text-center">
              Tap a tab above to get instant on-site AI assistance for this job.
            </Text>
          </View>
        )}
      </ScrollView>
    </Modal>
  );
}
