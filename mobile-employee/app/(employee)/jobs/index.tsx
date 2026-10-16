/**
 * Jobs List (Employee) — Enterprise Jobber / Housecall Pro Edition.
 *
 * Scalable for 500+ jobs with zero clutter:
 *   1. 3 Master Segmented Tabs:
 *      - Active: Right now / En-Route / Today's Scheduled Work.
 *      - Upcoming: Tomorrow and future scheduled bookings grouped by date.
 *      - History: 500+ completed & invoiced jobs grouped by month with search & pagination.
 *   2. Modern elevated cards with color-coded status rails, quoted amount pills,
 *      scheduled time chips, and 1-tap quick action triggers (Navigate, Call).
 *   3. Integrated Emergency SOS distress button in header.
 *   4. Instant client-side search across customer names, addresses, and service categories.
 *   5. Pull-to-refresh + infinite pagination support.
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  TextInput,
  RefreshControl,
  Linking,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  Search,
  MapPin,
  Clock,
  X,
  Briefcase,
  Navigation,
  Phone,
  Calendar,
  ShieldAlert,
  ChevronRight,
  Filter,
} from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonList } from '@/components/ui/Skeleton';
import { InlineSpinner } from '@/components/ui/Spinner';
import { SosModal } from '@/components/safety/SosModal';
import { OfflineStatusBar } from '@/components/ui/OfflineStatusBar';
import { useEmployeeJobs, useLoadMoreJobs } from '@/hooks/use-jobs';
import { useAuthStore } from '@/stores/auth-store';
import { COLORS } from '@/lib/constants';
import { formatCurrency } from '@/lib/currency';
import { getStatusVariant, formatStatusLabel } from '@/lib/status-colors';
import type { Job } from '@/types';

type MasterTab = 'active' | 'upcoming' | 'history';

interface DateGroupedSection {
  title: string;
  count: number;
  data: Job[];
}

export default function JobsListScreen() {
  const queryClient = useQueryClient();
  const tenantCurrency = useAuthStore((s) => s.tenant?.currency ?? 'USD');

  const [activeTab, setActiveTab] = useState<MasterTab>('active');
  const [subFilter, setSubFilter] = useState<string>('all');
  const [searchInput, setSearchInput] = useState('');
  const [showSosModal, setShowSosModal] = useState(false);

  const { data, isLoading, isRefetching, refetch, error } = useEmployeeJobs('all');
  const loadMore = useLoadMoreJobs('all');

  const hasMore = (data?.length ?? 0) >= 50;

  const handleLoadMore = useCallback(() => {
    if (loadMore.isPending || !hasMore) return;
    loadMore.mutate({ offset: data?.length ?? 0 });
  }, [loadMore, hasMore, data?.length]);

  const refreshAll = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['jobs', 'employee'] });
    refetch();
  }, [queryClient, refetch]);

  // Tab Counts computation
  const { activeJobsRaw, upcomingJobsRaw, historyJobsRaw } = useMemo(() => {
    const list = data ?? [];
    const now = new Date();
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const active: Job[] = [];
    const upcoming: Job[] = [];
    const history: Job[] = [];

    for (const j of list) {
      const state = (j.lifecycleState || j.status || '').toLowerCase();
      const isCompleteOrCancelled =
        state === 'completed' ||
        state === 'invoice_generated' ||
        state === 'paid' ||
        state === 'cancelled';

      if (isCompleteOrCancelled) {
        history.push(j);
      } else {
        const sched = j.scheduledAt ? new Date(j.scheduledAt) : null;
        if (sched && sched > endOfDay) {
          upcoming.push(j);
        } else {
          active.push(j);
        }
      }
    }

    return {
      activeJobsRaw: active,
      upcomingJobsRaw: upcoming,
      historyJobsRaw: history,
    };
  }, [data]);

  // Filtered jobs based on current tab, sub-filter, and search input
  const currentTabJobs = useMemo<Job[]>(() => {
    let source: Job[] = [];
    if (activeTab === 'active') source = activeJobsRaw;
    else if (activeTab === 'upcoming') source = upcomingJobsRaw;
    else source = historyJobsRaw;

    const q = searchInput.trim().toLowerCase();

    return source.filter((j) => {
      const state = (j.lifecycleState || j.status || '').toLowerCase();

      // Apply sub-filters
      if (activeTab === 'active' && subFilter !== 'all') {
        if (state !== subFilter) return false;
      } else if (activeTab === 'history' && subFilter !== 'all') {
        const d = j.completedAt ? new Date(j.completedAt) : j.scheduledAt ? new Date(j.scheduledAt) : null;
        const now = new Date();
        if (subFilter === 'this_month') {
          if (!d || d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) return false;
        } else if (subFilter === 'last_month') {
          const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
          const lastYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
          if (!d || d.getMonth() !== lastMonth || d.getFullYear() !== lastYear) return false;
        }
      }

      // Search query filter
      if (!q) return true;
      const title = j.title?.toLowerCase() ?? '';
      const name = j.customer?.name?.toLowerCase() ?? '';
      const address = j.address?.toLowerCase() ?? '';
      const service = j.service?.name?.toLowerCase() ?? '';
      return title.includes(q) || name.includes(q) || address.includes(q) || service.includes(q);
    });
  }, [activeTab, subFilter, searchInput, activeJobsRaw, upcomingJobsRaw, historyJobsRaw]);

  // Section Grouping for 500+ jobs scalability
  const groupedSections = useMemo<DateGroupedSection[]>(() => {
    if (currentTabJobs.length === 0) return [];

    if (activeTab === 'active') {
      const inProgress: Job[] = [];
      const scheduledToday: Job[] = [];

      for (const j of currentTabJobs) {
        const state = (j.lifecycleState || j.status || '').toLowerCase();
        if (['working', 'paused', 'arrived', 'travelling'].includes(state)) {
          inProgress.push(j);
        } else {
          scheduledToday.push(j);
        }
      }

      const sections: DateGroupedSection[] = [];
      if (inProgress.length > 0) {
        sections.push({ title: '⚡ In Progress & On-Site', count: inProgress.length, data: inProgress });
      }
      if (scheduledToday.length > 0) {
        sections.push({ title: "📅 Today's Queue", count: scheduledToday.length, data: scheduledToday });
      }
      return sections.length > 0 ? sections : [{ title: 'Active Jobs', count: currentTabJobs.length, data: currentTabJobs }];
    }

    if (activeTab === 'upcoming') {
      const map = new Map<string, Job[]>();
      for (const j of currentTabJobs) {
        if (!j.scheduledAt) {
          const list = map.get('Unscheduled Future') ?? [];
          list.push(j);
          map.set('Unscheduled Future', list);
          continue;
        }
        const d = new Date(j.scheduledAt);
        const dayKey = d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
        const list = map.get(dayKey) ?? [];
        list.push(j);
        map.set(dayKey, list);
      }
      return Array.from(map.entries()).map(([title, list]) => ({
        title,
        count: list.length,
        data: list,
      }));
    }

    // History Tab: Group by Month (e.g. October 2026, September 2026)
    const map = new Map<string, Job[]>();
    for (const j of currentTabJobs) {
      const targetDate = j.completedAt
        ? new Date(j.completedAt)
        : j.scheduledAt
        ? new Date(j.scheduledAt)
        : j.createdAt
        ? new Date(j.createdAt)
        : new Date();
      const monthKey = targetDate.toLocaleDateString([], { month: 'long', year: 'numeric' });
      const list = map.get(monthKey) ?? [];
      list.push(j);
      map.set(monthKey, list);
    }
    return Array.from(map.entries()).map(([title, list]) => ({
      title,
      count: list.length,
      data: list,
    }));
  }, [currentTabJobs, activeTab]);

  const handleDirections = (address?: string | null) => {
    if (!address) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const encoded = encodeURIComponent(address);
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encoded}`).catch(() => {});
  };

  const handleCall = (phone?: string | null) => {
    if (!phone) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    Linking.openURL(`tel:${phone}`).catch(() => {});
  };

  const renderJobCard = (item: Job) => {
    const state = item.lifecycleState || item.status || 'assigned';
    const variant = getStatusVariant(state);
    const label = formatStatusLabel(state);

    // Left status rail accent color
    let railColor = '#94A3B8';
    if (state === 'working') railColor = '#10B981';
    else if (state === 'travelling' || state === 'start_travel') railColor = '#0EA5E9';
    else if (state === 'arrived') railColor = '#6366F1';
    else if (state === 'paused') railColor = '#F59E0B';
    else if (state === 'completed' || state === 'paid' || state === 'invoice_generated') railColor = '#059669';

    return (
      <Pressable
        key={item.id}
        onPress={() => {
          Haptics.selectionAsync().catch(() => {});
          router.push({
            pathname: '/(employee)/jobs/[id]',
            params: { id: item.id },
          });
        }}
        accessibilityRole="button"
        accessibilityLabel={`Open job for ${item.customer?.name ?? 'customer'}`}
        className="mb-3 overflow-hidden rounded-2xl border border-border bg-white shadow-xs active:opacity-85"
      >
        <View className="flex-row">
          {/* Status color rail */}
          <View style={{ width: 5, backgroundColor: railColor }} />

          <View className="flex-1 p-3.5">
            {/* Top row: Customer Name + Status Badge + Quoted Amount */}
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-2">
                <Text className="text-sm font-extrabold text-foreground" numberOfLines={1}>
                  {item.customer?.name || item.title || 'Client Service'}
                </Text>
                {item.title && item.title !== item.customer?.name ? (
                  <Text className="text-xs font-medium text-muted-foreground" numberOfLines={1}>
                    {item.title}
                  </Text>
                ) : null}
              </View>

              <View className="flex-row items-center gap-1.5">
                {item.quotedAmount != null && item.quotedAmount > 0 ? (
                  <View className="rounded-md bg-emerald-50 px-2 py-0.5 border border-emerald-200">
                    <Text className="text-[11px] font-bold text-emerald-800">
                      {formatCurrency(item.quotedAmount, tenantCurrency)}
                    </Text>
                  </View>
                ) : null}
                <Badge variant={variant}>{label}</Badge>
              </View>
            </View>

            {/* Service Category */}
            {item.service?.name ? (
              <View className="mt-1 flex-row items-center">
                <View className="rounded bg-primary-50 px-1.5 py-0.5">
                  <Text className="text-[10px] font-bold uppercase tracking-wider text-primary-700">
                    {item.service.name}
                  </Text>
                </View>
              </View>
            ) : null}

            {/* Time row */}
            <View className="mt-2 flex-row items-center">
              <Clock size={13} color={COLORS.mutedForeground} />
              <Text className="ml-1.5 text-xs text-muted-foreground font-medium">
                {item.scheduledAt
                  ? new Date(item.scheduledAt).toLocaleString([], {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'Not scheduled'}
              </Text>
            </View>

            {/* Address Row + Quick Navigation Trigger */}
            {item.address ? (
              <View className="mt-1.5 flex-row items-center justify-between">
                <View className="flex-row items-center flex-1 pr-2">
                  <MapPin size={13} color={COLORS.mutedForeground} />
                  <Text
                    className="ml-1.5 flex-1 text-xs text-muted-foreground"
                    numberOfLines={1}
                  >
                    {item.address}
                  </Text>
                </View>

                {/* 1-Tap Directions */}
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    handleDirections(item.address);
                  }}
                  hitSlop={6}
                  className="flex-row items-center rounded-lg bg-slate-100 px-2 py-1 active:bg-slate-200"
                >
                  <Navigation size={11} color="#475569" />
                  <Text className="ml-1 text-[11px] font-semibold text-slate-700">Map</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        </View>
      </Pressable>
    );
  };

  const renderHeader = () => (
    <View className="mb-3">
      <OfflineStatusBar />
      {/* Title + SOS Emergency Safety Button */}
      <View className="mb-3 mt-1 flex-row items-center justify-between">
        <View>
          <Text className="text-2xl font-black text-foreground">Jobs</Text>
          <Text className="text-xs text-muted-foreground">
            {activeJobsRaw.length} active · {upcomingJobsRaw.length} upcoming · {historyJobsRaw.length} history
          </Text>
        </View>

        {/* SOS Emergency Button */}
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
            setShowSosModal(true);
          }}
          accessibilityRole="button"
          accessibilityLabel="Emergency SOS Distress Signal"
          className="flex-row items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5 border border-red-300 shadow-xs active:bg-red-100"
        >
          <ShieldAlert size={16} color="#DC2626" />
          <Text className="text-xs font-black text-red-600 tracking-wider">SOS</Text>
        </Pressable>
      </View>

      {/* 3 Master Segmented Tabs */}
      <View className="flex-row rounded-2xl bg-muted p-1 border border-border/60 mb-3">
        <Pressable
          onPress={() => {
            Haptics.selectionAsync().catch(() => {});
            setActiveTab('active');
            setSubFilter('all');
          }}
          className={`flex-1 items-center justify-center py-2 rounded-xl flex-row gap-1.5 ${
            activeTab === 'active' ? 'bg-white shadow-xs' : ''
          }`}
        >
          <Text
            className={`text-xs font-extrabold ${
              activeTab === 'active' ? 'text-primary-700' : 'text-muted-foreground'
            }`}
          >
            Active
          </Text>
          <View
            className={`px-1.5 py-0.2 rounded-full ${
              activeTab === 'active' ? 'bg-primary-100' : 'bg-slate-200'
            }`}
          >
            <Text
              className={`text-[10px] font-bold ${
                activeTab === 'active' ? 'text-primary-800' : 'text-slate-600'
              }`}
            >
              {activeJobsRaw.length}
            </Text>
          </View>
        </Pressable>

        <Pressable
          onPress={() => {
            Haptics.selectionAsync().catch(() => {});
            setActiveTab('upcoming');
            setSubFilter('all');
          }}
          className={`flex-1 items-center justify-center py-2 rounded-xl flex-row gap-1.5 ${
            activeTab === 'upcoming' ? 'bg-white shadow-xs' : ''
          }`}
        >
          <Text
            className={`text-xs font-extrabold ${
              activeTab === 'upcoming' ? 'text-primary-700' : 'text-muted-foreground'
            }`}
          >
            Upcoming
          </Text>
          <View
            className={`px-1.5 py-0.2 rounded-full ${
              activeTab === 'upcoming' ? 'bg-primary-100' : 'bg-slate-200'
            }`}
          >
            <Text
              className={`text-[10px] font-bold ${
                activeTab === 'upcoming' ? 'text-primary-800' : 'text-slate-600'
              }`}
            >
              {upcomingJobsRaw.length}
            </Text>
          </View>
        </Pressable>

        <Pressable
          onPress={() => {
            Haptics.selectionAsync().catch(() => {});
            setActiveTab('history');
            setSubFilter('all');
          }}
          className={`flex-1 items-center justify-center py-2 rounded-xl flex-row gap-1.5 ${
            activeTab === 'history' ? 'bg-white shadow-xs' : ''
          }`}
        >
          <Text
            className={`text-xs font-extrabold ${
              activeTab === 'history' ? 'text-primary-700' : 'text-muted-foreground'
            }`}
          >
            History
          </Text>
          <View
            className={`px-1.5 py-0.2 rounded-full ${
              activeTab === 'history' ? 'bg-primary-100' : 'bg-slate-200'
            }`}
          >
            <Text
              className={`text-[10px] font-bold ${
                activeTab === 'history' ? 'text-primary-800' : 'text-slate-600'
              }`}
            >
              {historyJobsRaw.length}
            </Text>
          </View>
        </Pressable>
      </View>

      {/* Search Bar */}
      <View className="flex-row items-center rounded-xl border border-border bg-white px-3 py-2 mb-2.5">
        <Search size={16} color={COLORS.mutedForeground} />
        <TextInput
          value={searchInput}
          onChangeText={setSearchInput}
          placeholder={
            activeTab === 'history'
              ? 'Search 500+ history by customer, service...'
              : 'Search customer, service, address...'
          }
          placeholderTextColor="#9CA3AF"
          className="ml-2 flex-1 text-sm text-foreground py-0.5"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchInput.length > 0 ? (
          <Pressable onPress={() => setSearchInput('')} hitSlop={8}>
            <X size={16} color={COLORS.mutedForeground} />
          </Pressable>
        ) : null}
      </View>

      {/* Sub-filter chips */}
      {activeTab === 'active' && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row py-1">
          {[
            { key: 'all', label: 'All Active' },
            { key: 'working', label: 'Working' },
            { key: 'travelling', label: 'Travelling' },
            { key: 'arrived', label: 'Arrived' },
            { key: 'assigned', label: 'Assigned' },
            { key: 'paused', label: 'Paused' },
          ].map((chip) => {
            const selected = subFilter === chip.key;
            return (
              <Pressable
                key={chip.key}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setSubFilter(chip.key);
                }}
                className={`mr-2 rounded-full px-3 py-1 border ${
                  selected ? 'bg-primary-600 border-primary-600' : 'bg-white border-border'
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    selected ? 'text-white' : 'text-muted-foreground'
                  }`}
                >
                  {chip.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {activeTab === 'history' && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row py-1">
          {[
            { key: 'all', label: 'All History' },
            { key: 'this_month', label: 'This Month' },
            { key: 'last_month', label: 'Last Month' },
          ].map((chip) => {
            const selected = subFilter === chip.key;
            return (
              <Pressable
                key={chip.key}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setSubFilter(chip.key);
                }}
                className={`mr-2 rounded-full px-3 py-1 border ${
                  selected ? 'bg-primary-600 border-primary-600' : 'bg-white border-border'
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    selected ? 'text-white' : 'text-muted-foreground'
                  }`}
                >
                  {chip.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
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
          description={error instanceof Error ? error.message : 'Something went wrong.'}
          actionLabel="Retry"
          onAction={() => refetch()}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <FlatList
        data={groupedSections}
        keyExtractor={(sec) => sec.title}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={!!isRefetching}
            onRefresh={refreshAll}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        renderItem={({ item: section }) => (
          <View className="mb-4">
            {/* Section Header */}
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                {section.title}
              </Text>
              <View className="rounded-full bg-slate-100 px-2 py-0.5">
                <Text className="text-[10px] font-bold text-slate-600">
                  {section.count} {section.count === 1 ? 'job' : 'jobs'}
                </Text>
              </View>
            </View>

            {/* Job Cards */}
            {section.data.map(renderJobCard)}
          </View>
        )}
        ListEmptyComponent={
          <EmptyState
            icon={<Briefcase size={44} color={COLORS.mutedForeground} />}
            title={
              searchInput
                ? 'No matching jobs'
                : activeTab === 'active'
                ? 'No active jobs right now'
                : activeTab === 'upcoming'
                ? 'No upcoming jobs scheduled'
                : 'No completed jobs found'
            }
            description={
              searchInput
                ? 'Try adjusting your search terms.'
                : activeTab === 'active'
                ? 'When jobs are assigned to you for today, they will appear here.'
                : activeTab === 'upcoming'
                ? 'Future scheduled assignments will appear here.'
                : 'Jobs you complete will be archived here for your records.'
            }
            actionLabel={searchInput ? 'Clear search' : undefined}
            onAction={searchInput ? () => setSearchInput('') : undefined}
          />
        }
        ListFooterComponent={
          activeTab === 'history' && hasMore ? (
            <View className="mt-3 mb-4 items-center">
              <Pressable
                onPress={handleLoadMore}
                disabled={loadMore.isPending}
                className={`rounded-xl px-6 py-2.5 ${
                  loadMore.isPending ? 'bg-muted' : 'bg-primary-500'
                }`}
                accessibilityRole="button"
                accessibilityLabel="Load more jobs"
              >
                {loadMore.isPending ? (
                  <View className="flex-row items-center">
                    <InlineSpinner color="#fff" />
                    <Text className="ml-2 font-semibold text-white">Loading history…</Text>
                  </View>
                ) : (
                  <Text className="font-semibold text-white text-xs">Load More History</Text>
                )}
              </Pressable>
            </View>
          ) : null
        }
      />

      <SosModal
        visible={showSosModal}
        onClose={() => setShowSosModal(false)}
      />
    </SafeAreaView>
  );
}
