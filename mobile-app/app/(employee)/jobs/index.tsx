/**
 * Jobs List (Employee) — rewrite.
 *
 * - Filter chips use the PWA lifecycle states (assigned/accepted/travelling/
 *   arrived/working/paused/completed) — NOT the old en_route/on_site/in_progress
 *   names that mismatched the PWA.
 * - Fetches GET /api/employee/jobs?filter=all once, then filters client-side
 *   (so chips work without round-trips).
 * - Search by customer name / service / address.
 * - Cards: customer, service, scheduled time, address, lifecycle badge.
 * - Pull-to-refresh + loading + error + empty states.
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  TextInput,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Search, MapPin, Clock, X, Briefcase } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonList } from '@/components/ui/Skeleton';
import { useEmployeeJobs } from '@/hooks/use-jobs';
import { COLORS, JOB_LIFECYCLE, type JobLifecycleState } from '@/lib/constants';
import {
  getStatusVariant,
  formatStatusLabel,
} from '@/lib/status-colors';
import type { Job } from '@/types';

type FilterKey = 'all' | JobLifecycleState | 'cancelled';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'assigned', label: 'Assigned' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'travelling', label: 'Travelling' },
  { key: 'arrived', label: 'Arrived' },
  { key: 'working', label: 'Working' },
  { key: 'paused', label: 'Paused' },
  { key: 'completed', label: 'Completed' },
];

const formatDateTime = (iso: string | null): string => {
  if (!iso) return 'Not scheduled';
  const d = new Date(iso);
  return d.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

function LifecycleBadge({ state }: { state: string }) {
  // Uses the shared canonical status-colors helper (T3.1) so the job list,
  // detail, and today screens all render 'working' as success/green.
  const variant = getStatusVariant(state);
  const label = formatStatusLabel(state);
  return <Badge variant={variant}>{label}</Badge>;
}

export default function JobsListScreen() {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');

  const { data, isLoading, isRefetching, refetch, error } = useEmployeeJobs('all');

  const filteredJobs = useMemo<Job[]>(() => {
    const list = data ?? [];
    const q = searchInput.trim().toLowerCase();
    return list.filter((j) => {
      const state = (j.lifecycleState || j.status || '').toLowerCase();
      if (filter !== 'all' && state !== filter) return false;
      if (!q) return true;
      const name = j.customer?.name?.toLowerCase() ?? '';
      const address = j.address?.toLowerCase() ?? '';
      const service = j.service?.name?.toLowerCase() ?? '';
      return name.includes(q) || address.includes(q) || service.includes(q);
    });
  }, [data, filter, searchInput]);

  const refreshAll = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['jobs', 'employee'] });
    refetch();
  }, [queryClient, refetch]);

  const renderJob = ({ item }: { item: Job }) => {
    const state = item.lifecycleState || item.status || 'unknown';
    return (
      <Pressable
        onPress={() =>
          router.push({
            pathname: '/(employee)/jobs/[id]',
            params: { id: item.id },
          })
        }
        accessibilityRole="button"
        accessibilityLabel={`Open job for ${item.customer?.name ?? 'customer'}`}
        className="active:opacity-70"
      >
        <Card className="mb-3">
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-base font-bold text-foreground" numberOfLines={2}>
                {item.title || item.customer?.name || 'Job'}
              </Text>
              {item.title ? (
                <Text className="mt-0.5 text-xs text-muted-foreground" numberOfLines={1}>
                  {item.customer?.name || 'Customer'}
                </Text>
              ) : null}
              {item.service ? (
                <Text className="mt-0.5 text-sm font-medium text-primary-700">
                  {item.service.name}
                </Text>
              ) : null}
            </View>
            <LifecycleBadge state={state} />
          </View>

          <View className="mt-2.5 flex-row items-center">
            <Clock size={13} color={COLORS.mutedForeground} />
            <Text className="ml-1.5 text-xs text-muted-foreground">
              {formatDateTime(item.scheduledAt)}
            </Text>
          </View>

          {item.address ? (
            <View className="mt-1.5 flex-row items-center">
              <MapPin size={13} color={COLORS.mutedForeground} />
              <Text
                className="ml-1.5 flex-1 text-xs text-muted-foreground"
                numberOfLines={2}
              >
                {item.address}
              </Text>
            </View>
          ) : null}
        </Card>
      </Pressable>
    );
  };

  const renderHeader = () => (
    <View className="mb-3">
      {/* Search bar */}
      <View className="flex-row items-center rounded-xl border border-border bg-white px-3 py-2">
        <Search size={18} color={COLORS.mutedForeground} />
        <TextInput
          value={searchInput}
          onChangeText={setSearchInput}
          placeholder="Search customer, service, or address…"
          placeholderTextColor="#9CA3AF"
          className="ml-2 flex-1 text-base text-foreground"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchInput.length > 0 ? (
          <Pressable onPress={() => setSearchInput('')} hitSlop={8}>
            <X size={18} color={COLORS.mutedForeground} />
          </Pressable>
        ) : null}
      </View>

      {/* Lifecycle filter chips */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={FILTERS}
        keyExtractor={(f) => f.key}
        contentContainerStyle={{ paddingVertical: 10 }}
        renderItem={({ item: f }) => {
          const selected = filter === f.key;
          return (
            <Pressable
              onPress={() => setFilter(f.key)}
              className={`mr-2 rounded-full border px-3 py-1.5 ${
                selected
                  ? 'border-primary-500 bg-primary-500'
                  : 'border-border bg-white'
              }`}
            >
              <Text
                className={`text-xs font-semibold ${
                  selected ? 'text-white' : 'text-muted-foreground'
                }`}
              >
                {f.label}
              </Text>
            </Pressable>
          );
        }}
      />
    </View>
  );

  if (isLoading && !data) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-background px-4">
        <View className="mt-2 mb-3">
          <Text className="text-2xl font-bold text-foreground">Jobs</Text>
        </View>
        <SkeletonList count={4} />
      </SafeAreaView>
    );
  }

  if (error && !data) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-background px-4">
        <EmptyState
          icon={<Briefcase size={48} color={COLORS.mutedForeground} />}
          title="Couldn't load jobs"
          description={
            error instanceof Error ? error.message : 'Something went wrong.'
          }
          actionLabel="Retry"
          onAction={() => refetch()}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <FlatList
        data={filteredJobs}
        keyExtractor={(item) => item.id}
        renderItem={renderJob}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <EmptyState
            icon={<Briefcase size={48} color={COLORS.mutedForeground} />}
            title="No jobs found"
            description={
              searchInput || filter !== 'all'
                ? 'Try adjusting your search or filter.'
                : 'Jobs assigned to you will appear here.'
            }
            actionLabel={
              searchInput || filter !== 'all' ? 'Clear filters' : undefined
            }
            onAction={
              searchInput || filter !== 'all'
                ? () => {
                    setSearchInput('');
                    setFilter('all');
                  }
                : undefined
            }
          />
        }
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={!!isRefetching}
            onRefresh={refreshAll}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      />
    </SafeAreaView>
  );
}
