import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { apiRequest } from '../../lib/api';
import { colors, ui } from '../ui';
import type { SocialPostRow } from './posts-list';

import {
  WEEKDAYS,
  formatMonthYear,
  formatDayHeader,
  isSameDay,
  getMonthDays,
  getWeekDays,
} from '../../lib/calendar-utils';

export {
  WEEKDAYS,
  formatMonthYear,
  formatDayHeader,
  isSameDay,
  getMonthDays,
  getWeekDays,
};

export interface CalendarProps {
  onScheduleForDate?: (date: Date) => void;
  onSelectPost?: (post: SocialPostRow) => void;
  refreshTrigger?: number;
}

/**
 * Full-featured Dynamic Content Calendar
 * Used inside the "Posts & Calendar" tab.
 */
export function SocialCalendarView({
  onScheduleForDate,
  onSelectPost,
  refreshTrigger = 0,
}: CalendarProps) {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [posts, setPosts] = useState<SocialPostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [calendarMode, setCalendarMode] = useState<'month' | 'week'>('month');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const loadPosts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiRequest<{ posts: SocialPostRow[] }>(
        '/api/social/posts?limit=100'
      );
      setPosts(res.posts || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load scheduled posts.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPosts();
  }, [loadPosts, refreshTrigger]);

  const prevPeriod = () => {
    if (calendarMode === 'month') {
      setCurrentDate(new Date(year, month - 1, 1));
    } else {
      const d = new Date(selectedDate);
      d.setDate(d.getDate() - 7);
      setSelectedDate(d);
      setCurrentDate(d);
    }
  };

  const nextPeriod = () => {
    if (calendarMode === 'month') {
      setCurrentDate(new Date(year, month + 1, 1));
    } else {
      const d = new Date(selectedDate);
      d.setDate(d.getDate() + 7);
      setSelectedDate(d);
      setCurrentDate(d);
    }
  };

  const jumpToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  // Map posts by date key (YYYY-MM-DD)
  const postsByDate = useMemo(() => {
    const map = new Map<string, SocialPostRow[]>();
    for (const post of posts) {
      const timeStr = post.scheduledAt || post.publishedAt || post.createdAt;
      if (!timeStr) continue;
      const d = new Date(timeStr);
      if (Number.isNaN(d.getTime())) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`;
      const existing = map.get(key) || [];
      existing.push(post);
      map.set(key, existing);
    }
    return map;
  }, [posts]);

  // Posts for currently selected date
  const selectedDateKey = `${selectedDate.getFullYear()}-${String(
    selectedDate.getMonth() + 1
  ).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
  const selectedDayPosts = postsByDate.get(selectedDateKey) || [];

  const monthGridDays = useMemo(() => getMonthDays(year, month), [year, month]);
  const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate]);

  return (
    <View style={styles.container}>
      {/* ── Header Controls ── */}
      <View style={styles.calendarCard}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.monthTitle}>{formatMonthYear(currentDate)}</Text>
            <Text style={styles.subText}>
              {posts.length} total posts in content queue
            </Text>
          </View>

          <View style={styles.navRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Today"
              onPress={jumpToToday}
              style={styles.todayBtn}
            >
              <Text style={styles.todayBtnText}>Today</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Previous"
              onPress={prevPeriod}
              style={styles.arrowBtn}
              hitSlop={8}
            >
              <MaterialIcons name="chevron-left" size={22} color="#334155" />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Next"
              onPress={nextPeriod}
              style={styles.arrowBtn}
              hitSlop={8}
            >
              <MaterialIcons name="chevron-right" size={22} color="#334155" />
            </Pressable>
          </View>
        </View>

        {/* View Mode Toggle: Month vs Week */}
        <View style={styles.modeToggleRow}>
          <Pressable
            onPress={() => setCalendarMode('month')}
            style={[styles.modeToggleBtn, calendarMode === 'month' && styles.modeToggleBtnActive]}
          >
            <MaterialIcons
              name="calendar-month"
              size={14}
              color={calendarMode === 'month' ? '#009F50' : '#64748B'}
            />
            <Text
              style={[
                styles.modeToggleText,
                calendarMode === 'month' && styles.modeToggleTextActive,
              ]}
            >
              Month View
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setCalendarMode('week')}
            style={[styles.modeToggleBtn, calendarMode === 'week' && styles.modeToggleBtnActive]}
          >
            <MaterialIcons
              name="view-week"
              size={14}
              color={calendarMode === 'week' ? '#009F50' : '#64748B'}
            />
            <Text
              style={[
                styles.modeToggleText,
                calendarMode === 'week' && styles.modeToggleTextActive,
              ]}
            >
              Week View
            </Text>
          </Pressable>
        </View>

        {/* Weekday headers */}
        <View style={styles.weekdaysHeader}>
          {WEEKDAYS.map((wd) => (
            <Text key={wd} style={styles.weekdayLabel}>
              {wd}
            </Text>
          ))}
        </View>

        {/* Calendar Grid (Month) */}
        {calendarMode === 'month' ? (
          <View style={styles.daysGrid}>
            {monthGridDays.map(({ date, isCurrentMonth }, idx) => {
              const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
                2,
                '0'
              )}-${String(date.getDate()).padStart(2, '0')}`;
              const dayPosts = postsByDate.get(dayKey) || [];
              const isSelected = isSameDay(date, selectedDate);
              const isToday = isSameDay(date, new Date());

              return (
                <Pressable
                  key={`day-${idx}`}
                  onPress={() => {
                    setSelectedDate(date);
                    if (!isCurrentMonth) {
                      setCurrentDate(date);
                    }
                  }}
                  style={[
                    styles.dayCell,
                    isSelected && styles.dayCellSelected,
                    isToday && !isSelected && styles.dayCellToday,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayNumber,
                      !isCurrentMonth && styles.dayNumberDim,
                      isSelected && styles.dayNumberSelected,
                      isToday && !isSelected && styles.dayNumberToday,
                    ]}
                  >
                    {date.getDate()}
                  </Text>

                  {/* Dot indicators for posts on this date */}
                  <View style={styles.dotsRow}>
                    {dayPosts.slice(0, 3).map((p, pIdx) => {
                      const isPub = p.status === 'published';
                      const isFail = p.status === 'failed';
                      const isPend = p.approvalStatus === 'pending';
                      return (
                        <View
                          key={`dot-${p.id || pIdx}`}
                          style={[
                            styles.postDot,
                            isPub && styles.postDotPublished,
                            isFail && styles.postDotFailed,
                            isPend && styles.postDotPending,
                          ]}
                        />
                      );
                    })}
                    {dayPosts.length > 3 && (
                      <Text style={styles.extraDotsText}>+{dayPosts.length - 3}</Text>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : (
          /* Week View */
          <View style={styles.daysGrid}>
            {weekDays.map((date, idx) => {
              const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
                2,
                '0'
              )}-${String(date.getDate()).padStart(2, '0')}`;
              const dayPosts = postsByDate.get(dayKey) || [];
              const isSelected = isSameDay(date, selectedDate);
              const isToday = isSameDay(date, new Date());

              return (
                <Pressable
                  key={`wday-${idx}`}
                  onPress={() => setSelectedDate(date)}
                  style={[
                    styles.dayCell,
                    styles.weekCell,
                    isSelected && styles.dayCellSelected,
                    isToday && !isSelected && styles.dayCellToday,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayNumber,
                      isSelected && styles.dayNumberSelected,
                      isToday && !isSelected && styles.dayNumberToday,
                    ]}
                  >
                    {date.getDate()}
                  </Text>
                  <View style={styles.dotsRow}>
                    {dayPosts.slice(0, 3).map((p, pIdx) => (
                      <View
                        key={`wdot-${p.id || pIdx}`}
                        style={[
                          styles.postDot,
                          p.status === 'published' && styles.postDotPublished,
                          p.status === 'failed' && styles.postDotFailed,
                          p.approvalStatus === 'pending' && styles.postDotPending,
                        ]}
                      />
                    ))}
                    {dayPosts.length > 3 && (
                      <Text style={styles.extraDotsText}>+{dayPosts.length - 3}</Text>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Legend */}
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.postDot, styles.postDotPublished]} />
            <Text style={styles.legendLabel}>Published</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={styles.postDot} />
            <Text style={styles.legendLabel}>Scheduled</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.postDot, styles.postDotPending]} />
            <Text style={styles.legendLabel}>Pending</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.postDot, styles.postDotFailed]} />
            <Text style={styles.legendLabel}>Failed</Text>
          </View>
        </View>
      </View>

      {/* ── Day Inspector: Posts for Selected Date ── */}
      <View style={styles.inspectorCard}>
        <View style={styles.inspectorHeader}>
          <View>
            <Text style={styles.inspectorTitle}>{formatDayHeader(selectedDate)}</Text>
            <Text style={styles.inspectorSub}>
              {selectedDayPosts.length === 0
                ? 'No updates queued'
                : `${selectedDayPosts.length} post${selectedDayPosts.length === 1 ? '' : 's'} on this day`}
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => {
              if (onScheduleForDate) {
                onScheduleForDate(selectedDate);
              } else {
                router.push({
                  pathname: '/(tabs)/marketing',
                  params: { mode: 'studio', date: selectedDate.toISOString() },
                });
              }
            }}
            style={styles.addPostBtn}
          >
            <MaterialIcons name="add" size={16} color="#FFFFFF" />
            <Text style={styles.addPostBtnText}>Add Post</Text>
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator color="#009F50" style={{ padding: 24 }} />
        ) : selectedDayPosts.length === 0 ? (
          <View style={styles.emptyDayWrap}>
            <MaterialIcons name="event-available" size={32} color="#94A3B8" />
            <Text style={styles.emptyDayTitle}>No posts scheduled for this day</Text>
            <Text style={styles.emptyDayDesc}>
              Keep your profile active. Tap 'Add Post' to schedule a visual flyer or update.
            </Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {selectedDayPosts.map((post) => {
              const timeStr = post.scheduledAt || post.publishedAt || post.createdAt;
              const timeDisplay = timeStr
                ? new Date(timeStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '';
              const firstImage = post.mediaUrls?.[0];

              return (
                <Pressable
                  key={post.id}
                  onPress={() => onSelectPost && onSelectPost(post)}
                  style={styles.postItemCard}
                >
                  {firstImage ? (
                    <Image source={{ uri: firstImage }} style={styles.postThumb} />
                  ) : (
                    <View style={styles.postThumbFallback}>
                      <MaterialIcons name="article" size={20} color="#3B82F6" />
                    </View>
                  )}

                  <View style={{ flex: 1, gap: 3 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.postChannelTag}>
                          {post.publishTargets?.[0]?.platform?.toUpperCase() || 'GOOGLE'}
                        </Text>
                        {!!timeDisplay && <Text style={styles.postTimeText}>{timeDisplay}</Text>}
                      </View>

                      <View
                        style={[
                          styles.statusBadge,
                          post.status === 'published' && styles.statusBadgePub,
                          post.status === 'failed' && styles.statusBadgeFail,
                          post.approvalStatus === 'pending' && styles.statusBadgePend,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            post.status === 'published' && styles.statusBadgeTextPub,
                            post.status === 'failed' && styles.statusBadgeTextFail,
                            post.approvalStatus === 'pending' && styles.statusBadgeTextPend,
                          ]}
                        >
                          {post.approvalStatus === 'pending'
                            ? 'PENDING'
                            : post.status.toUpperCase()}
                        </Text>
                      </View>
                    </View>

                    <Text numberOfLines={2} style={styles.postSnippet}>
                      {post.content}
                    </Text>
                  </View>

                  <MaterialIcons name="chevron-right" size={18} color="#94A3B8" />
                </Pressable>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
}

/**
 * Compact Dashboard Card for index.tsx
 * Powered by dynamic calendar dates and live post counts.
 */
export function SocialCalendarCard({
  pendingApprovalCount = 0,
}: {
  pendingApprovalCount?: number;
}) {
  const router = useRouter();
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [posts, setPosts] = useState<SocialPostRow[]>([]);

  useEffect(() => {
    void apiRequest<{ posts: SocialPostRow[] }>('/api/social/posts?limit=50')
      .then((res) => setPosts(res.posts || []))
      .catch(() => {});
  }, []);

  // Compute current week days (Mon-Sun)
  const currentWeekDays = useMemo(() => {
    const today = new Date();
    return getWeekDays(today);
  }, []);

  // Group by date
  const postsCountByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const post of posts) {
      const timeStr = post.scheduledAt || post.publishedAt || post.createdAt;
      if (!timeStr) continue;
      const d = new Date(timeStr);
      if (Number.isNaN(d.getTime())) continue;
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      map.set(key, (map.get(key) || 0) + 1);
    }
    return map;
  }, [posts]);

  const activeDate = currentWeekDays[selectedDayIndex] || new Date();
  const activeKey = `${activeDate.getFullYear()}-${activeDate.getMonth()}-${activeDate.getDate()}`;
  const activePostCount = postsCountByDate.get(activeKey) || 0;

  return (
    <View style={styles.cardContainer}>
      <View style={styles.cardHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={styles.iconCircle}>
            <MaterialIcons name="calendar-today" size={18} color="#009F50" />
          </View>
          <View>
            <Text style={styles.cardTitle}>Social Content Calendar</Text>
            <Text style={styles.cardSub}>{formatMonthYear(new Date())}</Text>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/(tabs)/marketing?mode=posts&view=calendar')}
        >
          <Text style={styles.cardLink}>Full Calendar →</Text>
        </Pressable>
      </View>

      {/* Pending approval alert pill */}
      {pendingApprovalCount > 0 && (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/(tabs)/marketing?mode=posts&view=list')}
          style={styles.pendingBanner}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <MaterialIcons name="pending-actions" size={18} color="#FFFFFF" />
            <Text style={styles.pendingBannerText}>
              {pendingApprovalCount} post{pendingApprovalCount === 1 ? '' : 's'} awaiting your approval
            </Text>
          </View>
          <MaterialIcons name="arrow-forward" size={16} color="#FFFFFF" />
        </Pressable>
      )}

      {/* Days Row */}
      <View style={styles.weekRow}>
        {currentWeekDays.map((d, idx) => {
          const isSelected = selectedDayIndex === idx;
          const isToday = isSameDay(d, new Date());
          const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
          const count = postsCountByDate.get(key) || 0;
          const dayName = d.toLocaleDateString('en-US', { weekday: 'narrow' });

          return (
            <Pressable
              key={`dash-day-${idx}`}
              onPress={() => setSelectedDayIndex(idx)}
              style={[
                styles.dashDayCell,
                isSelected && styles.dashDayCellSelected,
                isToday && !isSelected && styles.dashDayCellToday,
              ]}
            >
              <Text style={[styles.dashDayName, isSelected && styles.dashDayNameSelected]}>
                {dayName}
              </Text>
              <Text style={[styles.dashDayNum, isSelected && styles.dashDayNumSelected]}>
                {d.getDate()}
              </Text>
              {count > 0 ? (
                <View style={[styles.dashDayDot, isSelected && styles.dashDayDotSelected]} />
              ) : (
                <View style={{ height: 4, width: 4, marginTop: 4 }} />
              )}
            </Pressable>
          );
        })}
      </View>

      {/* Selected day summary preview */}
      <View style={styles.dashDaySummary}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={styles.dashSummaryTitle}>{formatDayHeader(activeDate)}</Text>
          <Text style={styles.dashSummaryCount}>
            {activePostCount === 0 ? 'No posts scheduled' : `${activePostCount} scheduled`}
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() =>
            router.push({
              pathname: '/(tabs)/marketing',
              params: { mode: 'posts', view: 'calendar' },
            })
          }
          style={styles.openCalendarBtn}
        >
          <Text style={styles.openCalendarBtnText}>
            {activePostCount > 0 ? 'View & Edit Posts' : '＋ Schedule a Post'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 14,
  },
  calendarCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  subText: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  todayBtn: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  todayBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },
  arrowBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modeToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 3,
    gap: 4,
  },
  modeToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 8,
    gap: 5,
  },
  modeToggleBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  modeToggleText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
  },
  modeToggleTextActive: {
    fontWeight: '800',
    color: '#009F50',
  },
  weekdaysHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  weekdayLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 3,
    borderRadius: 10,
  },
  weekCell: {
    aspectRatio: 0.9,
    paddingVertical: 8,
  },
  dayCellSelected: {
    backgroundColor: '#009F50',
  },
  dayCellToday: {
    borderWidth: 1.5,
    borderColor: '#009F50',
    backgroundColor: '#F0FDF4',
  },
  dayNumber: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  dayNumberDim: {
    color: '#CBD5E1',
  },
  dayNumberSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  dayNumberToday: {
    color: '#009F50',
    fontWeight: '800',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    marginTop: 2,
    minHeight: 5,
  },
  postDot: {
    width: 4.5,
    height: 4.5,
    borderRadius: 2.5,
    backgroundColor: '#2563EB',
  },
  postDotPublished: {
    backgroundColor: '#16A34A',
  },
  postDotPending: {
    backgroundColor: '#D97706',
  },
  postDotFailed: {
    backgroundColor: '#DC2626',
  },
  extraDotsText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#64748B',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendLabel: {
    fontSize: 10.5,
    color: '#64748B',
    fontWeight: '600',
  },
  inspectorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
    gap: 14,
  },
  inspectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inspectorTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  inspectorSub: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  addPostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#009F50',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  addPostBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyDayWrap: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 6,
  },
  emptyDayTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#334155',
  },
  emptyDayDesc: {
    fontSize: 11.5,
    color: '#64748B',
    textAlign: 'center',
    maxWidth: 240,
    lineHeight: 16,
  },
  postItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  postThumb: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
  },
  postThumbFallback: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  postChannelTag: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#2563EB',
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  postTimeText: {
    fontSize: 10.5,
    color: '#64748B',
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#EFF6FF',
  },
  statusBadgePub: {
    backgroundColor: '#DCFCE7',
  },
  statusBadgePend: {
    backgroundColor: '#FEF3C7',
  },
  statusBadgeFail: {
    backgroundColor: '#FEE2E2',
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#2563EB',
  },
  statusBadgeTextPub: {
    color: '#15803D',
  },
  statusBadgeTextPend: {
    color: '#B45309',
  },
  statusBadgeTextFail: {
    color: '#B91C1C',
  },
  postSnippet: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 16,
  },

  // Dashboard widget card styles
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  cardSub: {
    fontSize: 11,
    color: '#64748B',
  },
  cardLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#009F50',
  },
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#9333EA',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  pendingBannerText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dashDayCell: {
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    minWidth: 38,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  dashDayCellSelected: {
    backgroundColor: '#009F50',
    borderColor: '#009F50',
  },
  dashDayCellToday: {
    borderWidth: 1,
    borderColor: '#009F50',
    backgroundColor: '#F0FDF4',
  },
  dashDayName: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  dashDayNameSelected: {
    color: '#FFFFFF',
  },
  dashDayNum: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 2,
  },
  dashDayNumSelected: {
    color: '#FFFFFF',
  },
  dashDayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#009F50',
    marginTop: 3,
  },
  dashDayDotSelected: {
    backgroundColor: '#FFFFFF',
  },
  dashDaySummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dashSummaryTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  dashSummaryCount: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 1,
  },
  openCalendarBtn: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  openCalendarBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
