/**
 * VoiceJobModal (Native Employee Mobile App)
 * ==========================================
 * Hands-free AI Mobile Field Copilot for field technicians.
 *
 * Allows technicians to speak or dictate job details in the field,
 * auto-assigning to themselves with provenance stamped in metadata.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  Mic,
  Sparkles,
  X,
  CheckCircle2,
  Calendar,
  Clock,
  User,
  ArrowRight,
  RotateCcw,
} from 'lucide-react-native';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api';
import { COLORS } from '@/lib/constants';

interface VoiceJobModalProps {
  visible: boolean;
  onClose: () => void;
  onJobCreated?: (job: any) => void;
}

const VOICE_PRESETS = [
  '⚡ AC repair for Rahul tomorrow at 3 PM, assign to me',
  '🚰 Emergency pipe leak fix for Sarah at 4 PM',
  '🧹 Deep clean for Priya on Monday ₹2500, for myself',
];

export function VoiceJobModal({
  visible,
  onClose,
  onJobCreated,
}: VoiceJobModalProps) {
  const { show } = useToast();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const [transcript, setTranscript] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultJob, setResultJob] = useState<any>(null);

  const handleClose = () => {
    setTranscript('');
    setResultJob(null);
    setLoading(false);
    onClose();
  };

  const handleExecute = async (commandToRun?: string) => {
    const text = (commandToRun || transcript).trim();
    if (!text) {
      show('Please speak or type a command first.', 'warning');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setLoading(true);
    setResultJob(null);

    try {
      const res = await api.post<{
        success: boolean;
        action?: string;
        spokenFeedback?: string;
        data?: any;
        error?: string;
      }>('/api/ai/voice-command', {
        transcript: text,
      });

      if (!res || !res.success) {
        show(res?.spokenFeedback || res?.error || 'Could not understand command.', 'error');
        return;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      show(res.spokenFeedback || 'Job created successfully!', 'success');

      // Invalidate employee jobs cache so list updates immediately
      await queryClient.invalidateQueries({ queryKey: ['jobs', 'employee'] });

      const created = res.data?.job;
      if (created) {
        setResultJob(created);
        onJobCreated?.(created);
      } else {
        handleClose();
      }
    } catch (err: any) {
      console.warn('Voice command error:', err);
      show(err?.message || 'Failed to process voice command.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} onClose={handleClose} position="bottom">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="w-full"
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4 }}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center gap-2">
              <View className="size-9 rounded-xl bg-emerald-600 items-center justify-center shadow-xs">
                <Mic size={18} color="#FFFFFF" />
              </View>
              <View>
                <View className="flex-row items-center gap-1.5">
                  <Text className="text-base font-black text-foreground">
                    Voice Field Copilot
                  </Text>
                  <View className="bg-emerald-100 dark:bg-emerald-900/40 px-1.5 py-0.5 rounded-full">
                    <Text className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300">
                      AI Powered
                    </Text>
                  </View>
                </View>
                <Text className="text-xs text-muted-foreground">
                  Speak to schedule & self-assign jobs in seconds
                </Text>
              </View>
            </View>

            <Pressable
              onPress={handleClose}
              hitSlop={8}
              className="size-8 rounded-full bg-muted items-center justify-center active:bg-muted/80"
            >
              <X size={16} color={COLORS.mutedForeground} />
            </Pressable>
          </View>

          {/* Success Result View */}
          {resultJob ? (
            <View className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 mb-3 space-y-3">
              <View className="flex-row items-center gap-2">
                <CheckCircle2 size={20} color="#059669" />
                <Text className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                  Job Created & Assigned to You!
                </Text>
              </View>

              <View className="bg-background/90 p-3 rounded-xl border border-border/60">
                <View className="flex-row items-center justify-between mb-1.5">
                  <Text className="text-xs font-mono font-bold text-emerald-700">
                    #{resultJob.jobNumber || 'NEW'}
                  </Text>
                  <View className="bg-purple-100 dark:bg-purple-900/30 px-2 py-0.5 rounded-full flex-row items-center gap-1">
                    <Sparkles size={10} color="#7C3AED" />
                    <Text className="text-[10px] font-bold text-purple-700 dark:text-purple-300">
                      Created by You
                    </Text>
                  </View>
                </View>

                <Text className="text-sm font-black text-foreground mb-1">
                  {resultJob.title}
                </Text>

                <View className="space-y-1 pt-1">
                  {resultJob.customerName ? (
                    <View className="flex-row items-center gap-1.5">
                      <User size={12} color={COLORS.mutedForeground} />
                      <Text className="text-xs text-muted-foreground">
                        Customer: <Text className="font-semibold text-foreground">{resultJob.customerName}</Text>
                      </Text>
                    </View>
                  ) : null}

                  {resultJob.scheduledDate ? (
                    <View className="flex-row items-center gap-1.5">
                      <Calendar size={12} color={COLORS.mutedForeground} />
                      <Text className="text-xs text-muted-foreground">
                        Date: <Text className="font-semibold text-foreground">{resultJob.scheduledDate}</Text>
                        {resultJob.scheduledTime ? ` · ${resultJob.scheduledTime}` : ''}
                      </Text>
                    </View>
                  ) : null}

                  {typeof resultJob.amount === 'number' && resultJob.amount > 0 ? (
                    <Text className="text-xs font-bold text-emerald-600 font-mono mt-1">
                      Quoted: ${resultJob.amount.toFixed(2)}
                    </Text>
                  ) : null}
                </View>
              </View>

              <View className="flex-row items-center gap-2 pt-1">
                <Pressable
                  onPress={() => {
                    handleClose();
                    if (resultJob.id) {
                      router.push(`/(employee)/jobs/${resultJob.id}`);
                    }
                  }}
                  className="flex-1 h-10 rounded-xl bg-emerald-600 flex-row items-center justify-center gap-1.5 active:bg-emerald-700"
                >
                  <Text className="text-xs font-bold text-white">View Job</Text>
                  <ArrowRight size={14} color="#FFFFFF" />
                </Pressable>

                <Pressable
                  onPress={() => {
                    setResultJob(null);
                    setTranscript('');
                  }}
                  className="h-10 px-3 rounded-xl bg-background border border-border flex-row items-center justify-center gap-1 active:bg-muted"
                >
                  <RotateCcw size={13} color={COLORS.foreground} />
                  <Text className="text-xs font-semibold text-foreground">New Command</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <>
              {/* Spoken Transcript Input */}
              <View className="relative mb-3">
                <TextInput
                  value={transcript}
                  onChangeText={setTranscript}
                  placeholder='Tap mic on keyboard or type: "AC deep cleaning for Rahul tomorrow at 3 PM, assign to me"'
                  placeholderTextColor={COLORS.mutedForeground}
                  multiline
                  numberOfLines={3}
                  className="w-full min-h-[90px] p-3 text-sm text-foreground bg-muted/40 rounded-xl border border-border/80 text-left"
                  style={{ textAlignVertical: 'top' }}
                />
                {transcript.length > 0 && (
                  <Pressable
                    onPress={() => setTranscript('')}
                    hitSlop={6}
                    className="absolute top-2 right-2 size-6 rounded-full bg-slate-200 dark:bg-slate-700 items-center justify-center"
                  >
                    <X size={12} color="#475569" />
                  </Pressable>
                )}
              </View>

              {/* Technician Self-Assign Badge */}
              <View className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 mb-3">
                <Sparkles size={12} color="#059669" />
                <Text className="text-[11px] text-emerald-800 dark:text-emerald-300 font-medium">
                  Logged as <Text className="font-bold">{user?.name || 'Technician'}</Text> · Saying &quot;for me&quot; or omitting assignee auto-assigns to you.
                </Text>
              </View>

              {/* Presets Chips */}
              <View className="mb-4">
                <Text className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Or Try An Example
                </Text>
                <View className="gap-1.5">
                  {VOICE_PRESETS.map((preset, idx) => (
                    <Pressable
                      key={idx}
                      onPress={() => {
                        Haptics.selectionAsync().catch(() => {});
                        setTranscript(preset.slice(2)); // strip leading emoji
                      }}
                      className="p-2 rounded-lg bg-muted/60 border border-border/40 active:bg-muted"
                    >
                      <Text className="text-xs text-foreground font-medium">
                        {preset}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Submit Button */}
              <Pressable
                onPress={() => handleExecute()}
                disabled={loading || !transcript.trim()}
                className={`h-12 rounded-xl flex-row items-center justify-center gap-2 shadow-xs mb-2 ${
                  !transcript.trim() || loading
                    ? 'bg-emerald-600/50'
                    : 'bg-emerald-600 active:bg-emerald-700'
                }`}
              >
                {loading ? (
                  <>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text className="text-sm font-bold text-white">
                      Processing AI Command...
                    </Text>
                  </>
                ) : (
                  <>
                    <Mic size={16} color="#FFFFFF" />
                    <Text className="text-sm font-bold text-white">
                      Create Job with AI
                    </Text>
                  </>
                )}
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
