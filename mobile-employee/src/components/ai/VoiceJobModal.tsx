/**
 * VoiceJobModal (Native Employee Mobile App)
 * ==========================================
 * Hands-Free AI Mobile Copilot for field employees.
 *
 * Employees speak into the microphone; words are auto-typed in real time
 * without any manual keyboard entry. The AI Assistant then parses the
 * intent and automatically assigns the job to the logged-in technician.
 */
import React, { useState, useEffect } from 'react';
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
  MicOff,
  Sparkles,
  X,
  CheckCircle2,
  Calendar,
  Clock,
  User,
  ArrowRight,
  RotateCcw,
  Volume2,
} from 'lucide-react-native';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api';
import { COLORS } from '@/lib/constants';
import { useSpeechRecognition } from '@/hooks/use-speech-recognition';

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

  const [reviewing, setReviewing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resultJob, setResultJob] = useState<any>(null);

  const {
    isListening,
    transcript,
    setTranscript,
    isSupported,
    startListening,
    stopListening,
    toggleListening,
    resetTranscript,
  } = useSpeechRecognition();

  // Auto-start listening when modal opens to provide true hands-free assistant experience
  useEffect(() => {
    if (visible && isSupported && !resultJob) {
      const timer = setTimeout(() => {
        startListening();
      }, 350);
      return () => clearTimeout(timer);
    } else {
      stopListening();
    }
  }, [visible, isSupported, resultJob, startListening, stopListening]);

  const handleClose = () => {
    if (loading) return;
    stopListening();
    setReviewing(false);
    resetTranscript();
    setResultJob(null);
    setLoading(false);
    onClose();
  };

  const handleToggleMic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleExecute = async (commandToRun?: string) => {
    if (loading) return;
    const text = (commandToRun || transcript).trim();
    if (!text) {
      show('Please speak or type a command first.', 'warning');
      return;
    }

    stopListening();
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
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 16 }}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-1 flex-row items-center gap-2">
              <View className="size-9 rounded-xl bg-emerald-600 items-center justify-center shadow-xs">
                <Sparkles size={18} color="#FFFFFF" />
              </View>
              <View className="flex-1">
                <View className="flex-row flex-wrap items-center gap-1.5">
                  <Text className="text-base font-black text-foreground">
                    AI Employee Assistant
                  </Text>
                  <View className="bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 rounded-full flex-row items-center gap-1">
                    <Text className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300">
                      HANDS-FREE
                    </Text>
                  </View>
                </View>
                <Text className="text-xs text-muted-foreground">
                  Speak into the mic — automatically types as you speak
                </Text>
              </View>
            </View>

            <Pressable
              onPress={handleClose}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Close voice assistant"
              disabled={loading}
              className="size-10 rounded-full bg-muted items-center justify-center active:bg-muted/80"
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

              <View className="bg-background/90 p-3.5 rounded-xl border border-border/60">
                <View className="flex-row items-center justify-between mb-1.5">
                  <Text className="text-xs font-mono font-bold text-emerald-700">
                    #{resultJob.jobNumber || 'NEW'}
                  </Text>
                  <View className="bg-purple-100 dark:bg-purple-900/30 px-2 py-0.5 rounded-full flex-row items-center gap-1">
                    <Sparkles size={10} color="#7C3AED" />
                    <Text className="text-xs font-bold text-purple-700 dark:text-purple-300">
                      Auto-Assigned to You
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
                  className="flex-1 h-11 rounded-xl bg-emerald-600 flex-row items-center justify-center gap-1.5 active:bg-emerald-700"
                >
                  <Text className="text-xs font-bold text-white">View Job</Text>
                  <ArrowRight size={14} color="#FFFFFF" />
                </Pressable>

                <Pressable
                  onPress={() => {
                    setResultJob(null);
                    setReviewing(false);
                    resetTranscript();
                  }}
                  className="h-11 px-3.5 rounded-xl bg-background border border-border flex-row items-center justify-center gap-1 active:bg-muted"
                >
                  <RotateCcw size={13} color={COLORS.foreground} />
                  <Text className="text-xs font-semibold text-foreground">New Command</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <>
              {/* Central Pulsating Microphone Button */}
              <View className="items-center justify-center py-4">
                <View className="relative items-center justify-center">
                  {isListening && (
                    <View className="absolute size-24 rounded-full bg-red-500/20" />
                  )}
                  <Pressable
                    onPress={handleToggleMic}
                    disabled={loading}
                    className={`size-20 rounded-full items-center justify-center shadow-lg active:scale-95 ${
                      isListening
                        ? 'bg-red-500 border-4 border-red-300'
                        : 'bg-emerald-600 border-4 border-emerald-400/30'
                    }`}
                  >
                    {isListening ? (
                      <Mic size={32} color="#FFFFFF" />
                    ) : (
                      <MicOff size={28} color="#FFFFFF" />
                    )}
                  </Pressable>
                </View>

                {/* Status Indicator text */}
                <View className="flex-row items-center gap-1.5 mt-3">
                  {isListening ? (
                    <>
                      <View className="size-2.5 rounded-full bg-red-500" />
                      <Text className="text-xs font-bold text-red-600 dark:text-red-400">
                        Listening... Speak now (auto-typing live)
                      </Text>
                    </>
                  ) : (
                    <Text className="text-xs font-medium text-muted-foreground">
                      Tap mic to start auto-typing voice command
                    </Text>
                  )}
                </View>
              </View>

              {/* Real-time Auto-typed Transcript Box */}
              <View className="relative mb-3">
                <View className="flex-row items-center justify-between mb-1 px-1">
                  <Text className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Auto-Typed Voice Command
                  </Text>
                  {transcript.length > 0 && !loading && (
                    <Pressable
                      onPress={resetTranscript}
                      hitSlop={6}
                      className="flex-row items-center gap-1"
                    >
                      <X size={12} color={COLORS.mutedForeground} />
                      <Text className="text-[11px] text-muted-foreground">Clear</Text>
                    </Pressable>
                  )}
                </View>

                <TextInput
                  accessibilityLabel="Auto-typed job command"
                  editable={!loading && !reviewing}
                  value={transcript}
                  onChangeText={setTranscript}
                  placeholder='Speak now — e.g. "AC repair for Rahul tomorrow at 3 PM, assign to me"'
                  placeholderTextColor={COLORS.mutedForeground}
                  multiline
                  numberOfLines={3}
                  className={`w-full min-h-[90px] p-3 text-sm text-foreground rounded-xl border text-left ${
                    isListening
                      ? 'bg-red-500/5 border-red-400'
                      : 'bg-muted/40 border-border/80'
                  }`}
                  style={{ textAlignVertical: 'top' }}
                />
              </View>

              {/* Technician Self-Assign Badge */}
              <View className="flex-row items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 mb-3">
                <Sparkles size={13} color="#059669" />
                <Text className="text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                  Logged as <Text className="font-bold">{user?.name || 'Technician'}</Text> · Any job you dictate will automatically be assigned to you.
                </Text>
              </View>

              {/* Example Prompts */}
              {!reviewing && (
                <View className="mb-4">
                  <Text className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Or Tap An Example Prompt
                  </Text>
                  <View className="gap-1.5">
                    {VOICE_PRESETS.map((preset, idx) => (
                      <Pressable
                        key={idx}
                        disabled={loading || reviewing}
                        onPress={() => {
                          Haptics.selectionAsync().catch(() => {});
                          setTranscript(preset.replace(/^\S+\s+/, ''));
                        }}
                        className="p-2.5 rounded-lg bg-muted/60 border border-border/40 active:bg-emerald-50 active:border-emerald-300"
                      >
                        <Text className="text-xs text-foreground font-medium">
                          {preset}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}

              {/* Review Confirmation Prompt */}
              {reviewing && (
                <View className="mb-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 p-3.5 border border-amber-200 dark:border-amber-900/50">
                  <Text className="text-sm font-bold text-foreground">Confirm your voice command</Text>
                  <Text className="mt-1 text-xs text-muted-foreground">
                    &quot;{transcript}&quot;
                  </Text>
                  <Pressable
                    disabled={loading}
                    onPress={() => setReviewing(false)}
                    accessibilityRole="button"
                    className="mt-2"
                  >
                    <Text className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                      Edit or re-speak
                    </Text>
                  </Pressable>
                </View>
              )}

              {/* Submit Button */}
              <Pressable
                onPress={() => (reviewing ? void handleExecute() : setReviewing(true))}
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
                      AI is creating & assigning job...
                    </Text>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} color="#FFFFFF" />
                    <Text className="text-sm font-bold text-white">
                      {reviewing ? 'Confirm & Create Job' : 'Send to AI Assistant'}
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
