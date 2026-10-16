import React, { useState } from 'react';
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
  CheckCircle2,
  X,
  FileText,
  Send,
  AlertCircle,
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
  jobId: string;
  jobTitle: string;
  customerName: string;
  onApplyNotes?: (notes: string) => void;
}

export function FieldCopilotModal({
  visible,
  onClose,
  jobId,
  jobTitle,
  customerName,
  onApplyNotes,
}: FieldCopilotModalProps) {
  const { show } = useToast();
  const [activeTab, setActiveTab] = useState<CopilotTab>('troubleshoot');
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultText, setResultText] = useState<string | null>(null);

  const fetchAiInsight = async (action: 'troubleshoot' | 'summarize_customer' | 'upsell' | 'ask', q?: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setLoading(true);
    setResultText(null);

    try {
      const res = await api.post<{ text?: string; error?: string }>('/api/ai/field-assistant', {
        jobId,
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
    if (tab === 'troubleshoot') {
      fetchAiInsight('troubleshoot');
    } else if (tab === 'history') {
      fetchAiInsight('summarize_customer');
    } else if (tab === 'upsell') {
      fetchAiInsight('upsell');
    }
  };

  const handleAskQuestion = () => {
    const q = question.trim();
    if (!q) return;
    fetchAiInsight('ask', q);
  };

  const handleShareResult = async () => {
    if (!resultText) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    try {
      await Share.share({
        message: resultText,
        title: `AI Copilot — ${jobTitle}`,
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
      <ScrollView className="max-h-[80vh] px-1 pb-4" showsVerticalScrollIndicator={false}>
        {/* Title bar */}
        <View className="flex-row items-center justify-between mb-3 px-1">
          <View className="flex-row items-center gap-2">
            <Sparkles size={18} color="#059669" />
            <Text className="text-base font-bold text-slate-900">Field AI Copilot</Text>
          </View>
          <Pressable onPress={onClose} hitSlop={10} className="p-1">
            <X size={18} color="#64748B" />
          </Pressable>
        </View>

        {/* Header summary badge */}
        <View className="flex-row items-center justify-between p-3 mb-3 bg-emerald-50 rounded-xl border border-emerald-100">
          <View className="flex-row items-center gap-2 flex-1">
            <View className="size-8 rounded-lg bg-emerald-600 items-center justify-center">
              <Sparkles size={16} color="#ffffff" />
            </View>
            <View className="flex-1">
              <Text className="text-xs font-bold text-slate-800" numberOfLines={1}>
                {jobTitle}
              </Text>
              <Text className="text-[11px] text-slate-500">
                Customer: {customerName}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Action Chips */}
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
            <Wrench size={14} color={activeTab === 'troubleshoot' ? '#ffffff' : '#475569'} />
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
            <User size={14} color={activeTab === 'history' ? '#ffffff' : '#475569'} />
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
            <TrendingUp size={14} color={activeTab === 'upsell' ? '#ffffff' : '#475569'} />
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
            <HelpCircle size={14} color={activeTab === 'ask' ? '#ffffff' : '#475569'} />
            <Text
              className={`text-xs font-semibold ${
                activeTab === 'ask' ? 'text-white' : 'text-slate-700'
              }`}
            >
              Ask
            </Text>
          </Pressable>
        </View>

        {/* Free-form Question Input when 'ask' is selected */}
        {activeTab === 'ask' && (
          <View className="mb-3">
            <View className="flex-row items-center border border-slate-300 rounded-xl bg-white px-3 py-1">
              <TextInput
                value={question}
                onChangeText={setQuestion}
                placeholder="e.g. Error code E4 meaning on Daikin..."
                placeholderTextColor="#94a3b8"
                className="flex-1 text-xs py-2 text-slate-800"
                onSubmitEditing={handleAskQuestion}
                returnKeyType="send"
              />
              <Pressable
                onPress={handleAskQuestion}
                disabled={!question.trim() || loading}
                className="p-1.5 rounded-lg bg-emerald-600"
              >
                <Send size={14} color="#ffffff" />
              </Pressable>
            </View>
          </View>
        )}

        {/* Loading Spinner */}
        {loading && (
          <View className="py-10 items-center justify-center">
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text className="text-xs font-medium text-slate-500 mt-2.5">
              Consulting Field AI Copilot...
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
                className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200"
              >
                <Copy size={13} color="#475569" />
                <Text className="text-xs font-medium text-slate-700">Share</Text>
              </Pressable>

              {onApplyNotes && (
                <Pressable
                  onPress={handleApplyToNotes}
                  className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600"
                >
                  <FileText size={13} color="#ffffff" />
                  <Text className="text-xs font-semibold text-white">Apply to Notes</Text>
                </Pressable>
              )}
            </View>
          </Card>
        )}

        {/* Empty prompt when no result yet */}
        {!loading && !resultText && activeTab !== 'ask' && (
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
