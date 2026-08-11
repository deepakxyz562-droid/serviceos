/**
 * Job Checklist (Employee) — rewrite.
 *
 * PWA-parity features:
 *   - Fetches GET /api/jobs/[id]/checklist (ChecklistItem[]) — no longer
 *     relies solely on the embedded job.checklist.
 *   - Toggle checkbox via PATCH /api/jobs/[id]/checklist/item/[itemId].
 *   - Inline expandable notes field per item (PATCH with notes payload).
 *   - Progress bar at top: X/Y completed + %.
 *   - 100% green celebration banner.
 *   - Offline support: if a toggle or note-save fails because the device is
 *     offline, the operation is queued to AsyncStorage and auto-replayed
 *     next time the screen is focused. Toast: "Saved offline — will sync
 *     when online".
 *   - Pull-to-refresh + loading + empty states.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import {
  ArrowLeft,
  CircleCheck,
  Circle,
  Check,
  PartyPopper,
  SquareCheck,
  ChevronDown,
  ChevronUp,
  StickyNote,
  CloudOff,
} from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import {
  useJob,
  useJobChecklist,
  useToggleChecklistItem,
} from '@/hooks/use-jobs';
import { ApiRequestError } from '@/lib/api';
import { COLORS } from '@/lib/constants';
import {
  enqueue as enqueueOffline,
  getForJob as getOfflineForJob,
  remove as removeOffline,
  bumpAttempts as bumpOfflineAttempts,
  type OfflineQueueItem,
} from '@/lib/offline-queue';
import type { ChecklistItem } from '@/types';

const formatCompletedAt = (iso: string | null): string => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
};

export default function JobChecklistScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id =
    typeof params.id === 'string'
      ? params.id
      : Array.isArray(params.id)
        ? params.id[0]
        : '';
  const { show } = useToast();

  const jobQuery = useJob(id);
  const checklistQuery = useJobChecklist(id);
  const toggleItem = useToggleChecklistItem();

  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({});
  const [savingNoteId, setSavingNoteId] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  // Refs so the focus-effect drain closure always calls the freshest hook.
  // Updated in a useEffect (NOT during render — React 19+ forbids it).
  const toggleItemRef = useRef(toggleItem);
  const showRef = useRef(show);
  const checklistRefetchRef = useRef(checklistQuery.refetch);
  useEffect(() => {
    toggleItemRef.current = toggleItem;
    showRef.current = show;
    checklistRefetchRef.current = checklistQuery.refetch;
  }, [toggleItem, show, checklistQuery.refetch]);

  useFocusEffect(
    useCallback(() => {
      checklistQuery.refetch();
      // Drain the offline queue: re-attempt any checklist PATCH ops that
      // failed while the device was offline. Best-effort — failures stay
      // queued and get bumped attempts.
      (async () => {
        try {
          const pending = await getOfflineForJob(id, 'checklist');
          if (pending.length === 0) return;
          setPendingCount(pending.length);
          for (const item of pending) {
            try {
              const p = item.payload as {
                itemId: string;
                completed: boolean;
                notes?: string | null;
              };
              await toggleItemRef.current.mutateAsync({
                jobId: id,
                itemId: p.itemId,
                completed: p.completed,
                ...(p.notes !== undefined ? { notes: p.notes } : {}),
              });
              await removeOffline(item.id);
              setPendingCount((n) => Math.max(0, n - 1));
            } catch (err) {
              await bumpOfflineAttempts(item.id);
              if (err instanceof ApiRequestError && (err.statusCode === 0 || err.statusCode >= 500)) {
                break;
              }
            }
          }
          const remaining = await getOfflineForJob(id, 'checklist');
          setPendingCount(remaining.length);
          if (remaining.length === 0) {
            showRef.current('Offline checklist changes synced.', 'success');
            checklistRefetchRef.current();
          }
        } catch {
          /* swallow */
        }
      })();
      return () => {
        getOfflineForJob(id, 'checklist').then((p) => setPendingCount(p.length));
      };
    }, [id, checklistQuery])
  );

  const items: ChecklistItem[] =
    checklistQuery.data ?? jobQuery.data?.checklist ?? [];

  const completedCount = useMemo(
    () => items.filter((i) => i.completed).length,
    [items]
  );
  const totalCount = items.length;
  const allComplete = totalCount > 0 && completedCount === totalCount;
  const progressPct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const handleToggle = useCallback(
    async (item: ChecklistItem) => {
      if (togglingId) return;
      setTogglingId(item.id);
      try {
        await toggleItem.mutateAsync({
          jobId: id,
          itemId: item.id,
          completed: !item.completed,
        });
        show(!item.completed ? 'Marked complete.' : 'Marked incomplete.', 'success');
      } catch (err) {
        // Network / 5xx → enqueue the toggle for offline replay instead of
        // surfacing a hard error. The UI keeps the user's intended state;
        // the queue auto-drains on the next screen focus.
        const isNetwork =
          err instanceof ApiRequestError &&
          (err.statusCode === 0 || err.statusCode >= 500);
        if (isNetwork) {
          try {
            await enqueueOffline('checklist', id, {
              itemId: item.id,
              completed: !item.completed,
            });
            setPendingCount((n) => n + 1);
            show('Saved offline — will sync when online.', 'info');
            return;
          } catch {
            /* fall through to generic error */
          }
        }
        show(
          err instanceof Error ? err.message : 'Update failed.',
          'error'
        );
      } finally {
        setTogglingId(null);
      }
    },
    [id, togglingId, toggleItem, show]
  );

  const handleSaveNote = useCallback(
    async (item: ChecklistItem) => {
      const note = (noteDraft[item.id] ?? item.notes ?? '').trim();
      setSavingNoteId(item.id);
      try {
        await toggleItem.mutateAsync({
          jobId: id,
          itemId: item.id,
          completed: item.completed,
          notes: note,
        });
        show('Note saved.', 'success');
        setExpandedId(null);
      } catch (err) {
        const isNetwork =
          err instanceof ApiRequestError &&
          (err.statusCode === 0 || err.statusCode >= 500);
        if (isNetwork) {
          try {
            await enqueueOffline('checklist', id, {
              itemId: item.id,
              completed: item.completed,
              notes: note,
            });
            setPendingCount((n) => n + 1);
            show('Note saved offline — will sync when online.', 'info');
            setExpandedId(null);
            return;
          } catch {
            /* fall through */
          }
        }
        show(
          err instanceof Error ? err.message : 'Failed to save note.',
          'error'
        );
      } finally {
        setSavingNoteId(null);
      }
    },
    [id, noteDraft, toggleItem, show]
  );

  if (jobQuery.isLoading && !jobQuery.data && !checklistQuery.data) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-background">
        <Header onBack={() => router.back()} title="Checklist" />
        <Spinner />
      </SafeAreaView>
    );
  }

  if (jobQuery.error || (!jobQuery.data && !checklistQuery.data)) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-background">
        <Header onBack={() => router.back()} title="Checklist" />
        <EmptyState
          icon={<SquareCheck size={48} color={COLORS.mutedForeground} />}
          title="Job not found"
          description={
            jobQuery.error instanceof Error
              ? jobQuery.error.message
              : 'Please go back and try again.'
          }
          actionLabel="Go Back"
          onAction={() => router.back()}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <Header onBack={() => router.back()} title="Checklist" />

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={!!checklistQuery.isRefetching}
            onRefresh={() => checklistQuery.refetch()}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Progress card */}
        <Card className="mb-4 mt-2">
          <View className="flex-row items-center justify-between">
            <View>
              <View className="flex-row items-center">
                <Text className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Progress
                </Text>
                {pendingCount > 0 ? (
                  <View className="ml-2 flex-row items-center rounded-full bg-amber-100 px-2 py-0.5">
                    <CloudOff size={10} color={COLORS.warning} />
                    <Text className="ml-1 text-[10px] font-semibold text-amber-700">
                      {pendingCount} pending
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text className="mt-0.5 text-lg font-bold text-foreground">
                {completedCount} of {totalCount} completed
              </Text>
            </View>
            <Text className="text-2xl font-bold text-primary-600">
              {Math.round(progressPct)}%
            </Text>
          </View>
          {/* Progress bar */}
          <View className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <View
              style={{
                width: `${progressPct}%`,
                height: '100%',
                backgroundColor: COLORS.primary,
                borderRadius: 999,
              }}
            />
          </View>
          {allComplete ? (
            <View className="mt-3 flex-row items-center rounded-lg bg-primary-50 p-3">
              <PartyPopper size={18} color={COLORS.primary} />
              <Text className="ml-2 text-sm font-semibold text-primary-700">
                All items complete — great job!
              </Text>
            </View>
          ) : null}
        </Card>

        {/* Checklist items */}
        {items.length === 0 ? (
          <EmptyState
            icon={<SquareCheck size={48} color={COLORS.mutedForeground} />}
            title="No checklist items for this job"
            description="Checklist items will appear here when they are added to the job."
          />
        ) : (
          <View>
            {items.map((item) => {
              const isToggling = togglingId === item.id;
              const isExpanded = expandedId === item.id;
              const noteValue =
                noteDraft[item.id] ?? item.notes ?? '';
              const isSavingNote = savingNoteId === item.id;
              return (
                <View key={item.id} className="mb-2.5">
                  <Card>
                    <Pressable
                      onPress={() => handleToggle(item)}
                      disabled={!!togglingId}
                      accessibilityRole="button"
                      accessibilityLabel={
                        item.completed
                          ? `Mark "${item.label}" as incomplete`
                          : `Mark "${item.label}" as complete`
                      }
                    >
                      <View className="flex-row items-start">
                        <View className="mr-3 mt-0.5">
                          {isToggling ? (
                            <ActivityIndicator size={20} color={COLORS.primary} />
                          ) : item.completed ? (
                            <CircleCheck size={22} color={COLORS.primary} />
                          ) : (
                            <Circle size={22} color={COLORS.mutedForeground} />
                          )}
                        </View>
                        <View className="flex-1">
                          <Text
                            className={`text-sm font-medium ${
                              item.completed
                                ? 'text-muted-foreground line-through'
                                : 'text-foreground'
                            }`}
                          >
                            {item.label}
                          </Text>
                          {item.completed && item.completedAt ? (
                            <Text className="mt-0.5 text-xs text-muted-foreground">
                              Completed {formatCompletedAt(item.completedAt)}
                            </Text>
                          ) : null}
                          {item.notes ? (
                            <View className="mt-1.5 flex-row items-start rounded-md bg-muted p-2">
                              <StickyNote size={12} color={COLORS.mutedForeground} />
                              <Text className="ml-1.5 flex-1 text-xs text-foreground">
                                {item.notes}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                        {item.completed ? (
                          <View className="ml-2 rounded-full bg-primary-100 px-2 py-0.5">
                            <View className="flex-row items-center">
                              <Check size={10} color={COLORS.primary} />
                              <Text className="ml-1 text-[10px] font-bold uppercase text-primary-700">
                                Done
                              </Text>
                            </View>
                          </View>
                        ) : null}
                      </View>
                    </Pressable>

                    {/* Add / edit note */}
                    <Pressable
                      onPress={() => {
                        setExpandedId(isExpanded ? null : item.id);
                        if (!isExpanded) {
                          setNoteDraft((d) => ({
                            ...d,
                            [item.id]: item.notes ?? '',
                          }));
                        }
                      }}
                      className="mt-2 flex-row items-center self-start"
                    >
                      {isExpanded ? (
                        <ChevronUp size={12} color={COLORS.primary} />
                      ) : (
                        <ChevronDown size={12} color={COLORS.primary} />
                      )}
                      <Text className="ml-1 text-xs font-semibold text-primary-700">
                        {item.notes ? 'Edit note' : 'Add note'}
                      </Text>
                    </Pressable>

                    {isExpanded ? (
                      <View className="mt-2">
                        <TextInput
                          value={noteValue}
                          onChangeText={(t) =>
                            setNoteDraft((d) => ({ ...d, [item.id]: t }))
                          }
                          placeholder="Optional note about this item…"
                          placeholderTextColor="#9CA3AF"
                          multiline
                          className="rounded-lg border border-border bg-white p-2.5 text-sm text-foreground"
                          style={{ minHeight: 60 }}
                        />
                        <View className="mt-2 flex-row gap-2">
                          <View className="flex-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onPress={() => setExpandedId(null)}
                              disabled={isSavingNote}
                            >
                              Cancel
                            </Button>
                          </View>
                          <View className="flex-1">
                            <Button
                              size="sm"
                              onPress={() => handleSaveNote(item)}
                              loading={isSavingNote}
                            >
                              Save Note
                            </Button>
                          </View>
                        </View>
                      </View>
                    ) : null}
                  </Card>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
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
