/**
 * Job Notes Editor (Employee) — NEW.
 *
 * PWA-parity features:
 *   - Fetches the job (for notes + internalNotes).
 *   - Two text areas: "Customer Notes" (visible to customer) and "Internal
 *     Notes" (private to staff).
 *   - Save button: PUT /api/jobs/[id] { notes, internalNotes }.
 *   - Toast on save + navigate back.
 *   - Loading + error states.
 */
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import {
  ArrowLeft,
  StickyNote,
  Lock,
  Save,
} from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { useJob, useUpdateJob } from '@/hooks/use-jobs';
import { COLORS } from '@/lib/constants';

const MAX_LEN = 5000;

export default function JobNotesScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id =
    typeof params.id === 'string'
      ? params.id
      : Array.isArray(params.id)
        ? params.id[0]
        : '';
  const { show } = useToast();

  const { data: job, isLoading, error } = useJob(id);
  const updateJob = useUpdateJob();

  const [notes, setNotes] = useState(job?.notes ?? '');
  const [internalNotes, setInternalNotes] = useState(job?.internalNotes ?? '');
  const [lastJobId, setLastJobId] = useState(job?.id);

  // Adjust local state when the job changes (React "adjust during render" pattern).
  if (job?.id !== lastJobId) {
    setLastJobId(job?.id);
    setNotes(job?.notes ?? '');
    setInternalNotes(job?.internalNotes ?? '');
  }

  const handleSave = useCallback(async () => {
    if (!id) return;
    try {
      await updateJob.mutateAsync({
        id,
        notes: notes.trim() || null,
        internalNotes: internalNotes.trim() || null,
      });
      show('Notes saved.', 'success');
      router.back();
    } catch (err) {
      show(
        err instanceof Error ? err.message : 'Save failed. Please try again.',
        'error'
      );
    }
  }, [id, notes, internalNotes, updateJob, show]);

  if (isLoading && !job) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-background">
        <Header onBack={() => router.back()} title="Edit Notes" />
        <Spinner />
      </SafeAreaView>
    );
  }

  if (error || !job) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-background">
        <Header onBack={() => router.back()} title="Edit Notes" />
        <EmptyState
          icon={<StickyNote size={48} color={COLORS.mutedForeground} />}
          title="Job not found"
          description={
            error instanceof Error ? error.message : 'Please go back and try again.'
          }
          actionLabel="Go Back"
          onAction={() => router.back()}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <Header onBack={() => router.back()} title="Edit Notes" />

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text className="mb-3 mt-2 text-sm text-muted-foreground">
          Update notes for this job. Customer notes are visible to the customer;
          internal notes are staff-only.
        </Text>

        {/* Customer notes */}
        <Card className="mb-3">
          <View className="mb-2 flex-row items-center justify-between">
            <View className="flex-row items-center">
              <View className="mr-2 h-8 w-8 items-center justify-center rounded-full bg-primary-50">
                <StickyNote size={16} color={COLORS.primary} />
              </View>
              <View>
                <Text className="text-sm font-bold text-foreground">
                  Customer Notes
                </Text>
                <Text className="text-xs text-muted-foreground">
                  Visible to the customer
                </Text>
              </View>
            </View>
            <Text className="text-xs text-muted-foreground">
              {notes.length}/{MAX_LEN}
            </Text>
          </View>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Instructions, requests, or context shared with the customer…"
            placeholderTextColor="#9CA3AF"
            multiline
            className="rounded-lg border border-border bg-white p-3 text-sm text-foreground"
            style={{ minHeight: 120 }}
            maxLength={MAX_LEN}
            textAlignVertical="top"
          />
        </Card>

        {/* Internal notes */}
        <Card className="mb-3">
          <View className="mb-2 flex-row items-center justify-between">
            <View className="flex-row items-center">
              <View className="mr-2 h-8 w-8 items-center justify-center rounded-full bg-amber-50">
                <Lock size={16} color={COLORS.warning} />
              </View>
              <View>
                <Text className="text-sm font-bold text-foreground">
                  Internal Notes
                </Text>
                <Text className="text-xs text-muted-foreground">
                  Staff-only · not shown to customer
                </Text>
              </View>
            </View>
            <Text className="text-xs text-muted-foreground">
              {internalNotes.length}/{MAX_LEN}
            </Text>
          </View>
          <TextInput
            value={internalNotes}
            onChangeText={setInternalNotes}
            placeholder="Private notes for staff: access codes, hazards, special handling…"
            placeholderTextColor="#9CA3AF"
            multiline
            className="rounded-lg border border-amber-200 bg-amber-50/30 p-3 text-sm text-foreground"
            style={{ minHeight: 120 }}
            maxLength={MAX_LEN}
            textAlignVertical="top"
          />
        </Card>

        <Button onPress={handleSave} loading={updateJob.isPending} fullWidth>
          <View className="flex-row items-center justify-center">
            <Save size={16} color="#fff" />
            <Text className="ml-2 font-semibold text-white">Save Notes</Text>
          </View>
        </Button>
      </ScrollView>

      <LoadingOverlay visible={updateJob.isPending} message="Saving notes…" />
    </SafeAreaView>
  );
}

function Header({ onBack, title }: { onBack: () => void; title: string }) {
  return (
    <View className="flex-row items-center border-b border-border bg-white px-4 py-3">
      <Pressable
        onPress={onBack}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <ArrowLeft size={22} color={COLORS.foreground} />
      </Pressable>
      <Text className="ml-3 text-lg font-bold text-foreground">{title}</Text>
    </View>
  );
}
