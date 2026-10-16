import React, { useState } from 'react';
import {
  Pressable,
  Text,
  ActivityIndicator,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Sparkles } from 'lucide-react-native';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api';

interface NotesPolishButtonProps {
  jobId: string;
  rawNotes: string;
  onPolished: (polished: string) => void;
  label?: string;
  className?: string;
}

export function NotesPolishButton({
  jobId,
  rawNotes,
  onPolished,
  label = 'AI Polish',
  className = '',
}: NotesPolishButtonProps) {
  const { show } = useToast();
  const [loading, setLoading] = useState(false);

  const handlePolish = async () => {
    const text = rawNotes.trim();
    if (!text) {
      show('Type or dictate rough notes first — AI will clean them up.', 'info');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setLoading(true);

    try {
      const res = await api.post<{ text?: string; error?: string }>('/api/ai/field-assistant', {
        jobId,
        action: 'polish_notes',
        rawNotes: text,
      });

      if (res && res.text) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        onPolished(res.text);
        show('Notes polished & formatted ✓', 'success');
      } else {
        show(res?.error || 'Could not polish notes. Please try again.', 'error');
      }
    } catch (err: any) {
      console.warn('NotesPolishButton error:', err);
      show(err?.message || 'AI Polish failed. Check connection.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Pressable
      onPress={handlePolish}
      disabled={loading}
      className={`flex-row items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 active:bg-emerald-100 ${className}`}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#059669" />
      ) : (
        <Sparkles size={13} color="#059669" />
      )}
      <Text className="text-xs font-semibold text-emerald-700">
        {loading ? 'Polishing...' : label}
      </Text>
    </Pressable>
  );
}
