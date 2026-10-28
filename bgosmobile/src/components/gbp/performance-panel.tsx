import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Switch, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Action, Card, Empty, Field, colors, ui } from '../ui';
import { apiRequest, ApiError } from '../../lib/api';
import { AiActionsFeed } from './ai-actions';
import { SectionHeader, gbpColors } from './bits';
import type { AiAction, AnalyticsResult } from './types';

const BAR_MAX_HEIGHT = 64;

function pctChange(current: number, previous: number): number | null {
  if (!Number.isFinite(previous) || previous <= 0) return null;
  if (!Number.isFinite(current)) return null;
  return Math.round(((current - previous) / previous) * 100);
}

function MetricTile({
  label,
  value,
  icon,
  live,
  changePct,
}: {
  label: string;
  value: number;
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  live: boolean;
  changePct: number | null;
}) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.line,
        padding: 12,
        gap: 4,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <MaterialIcons name={icon} size={17} color={colors.brand} />
        {live ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: gbpColors.emerald }} />
            <Text style={{ fontSize: 10, fontWeight: '800', color: gbpColors.emerald }}>Live</Text>
          </View>
        ) : null}
      </View>
      <Text style={{ fontSize: 22, fontWeight: '800', color: colors.ink, letterSpacing: -0.5 }}>
        {value.toLocaleString()}
      </Text>
      <Text style={ui.caption}>{label}</Text>
      {changePct !== null ? (
        <Text
          style={{
            fontSize: 11.5,
            fontWeight: '800',
            color: changePct >= 0 ? gbpColors.emerald : colors.danger,
          }}
        >
          {changePct >= 0 ? '▲' : '▼'} {Math.abs(changePct)}%
        </Text>
      ) : (
        <Text style={{ fontSize: 10.5, color: colors.muted }}>Collecting data…</Text>
      )}
    </View>
  );
}

/**
 * Before/after grouped mini bar chart — rendered ONLY when a real baseline
 * (analytics.previousPeriod) exists. amber = before AI, brand green = after.
 * Bars are proportional to the max value in each group; never estimated.
 */
function BeforeAfterChart({
  before,
  after,
}: {
  before: { label: string; value: number }[];
  after: { label: string; value: number }[];
}) {
  return (
    <Card style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <MaterialIcons name="bar-chart" size={16} color={colors.brand} />
        <Text style={{ fontSize: 14, fontWeight: '800', color: colors.ink }}>Before / After AI</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 14 }}>
        {before.map((b, i) => {
          const a = after[i];
          if (!a) return null;
          const max = Math.max(b.value, a.value, 1);
          const scale = (v: number) => Math.max(6, Math.round((v / max) * BAR_MAX_HEIGHT));
          return (
            <View key={b.label} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: BAR_MAX_HEIGHT + 26 }}>
                <View style={{ alignItems: 'center', gap: 3 }}>
                  <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#B45309' }}>{b.value.toLocaleString()}</Text>
                  <View style={{ width: 26, height: scale(b.value), backgroundColor: gbpColors.amber, borderRadius: 6 }} />
                </View>
                <View style={{ alignItems: 'center', gap: 3 }}>
                  <Text style={{ fontSize: 10.5, fontWeight: '800', color: colors.brandDark }}>{a.value.toLocaleString()}</Text>
                  <View style={{ width: 26, height: scale(a.value), backgroundColor: colors.brand, borderRadius: 6 }} />
                </View>
              </View>
              <Text style={ui.caption} numberOfLines={1}>
                {b.label}
              </Text>
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <View style={{ width: 9, height: 9, borderRadius: 4, backgroundColor: gbpColors.amber }} />
          <Text style={ui.caption}>Before AI</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <View style={{ width: 9, height: 9, borderRadius: 4, backgroundColor: colors.brand }} />
          <Text style={ui.caption}>After AI</Text>
        </View>
      </View>
      <Text style={[ui.caption, { textAlign: 'center' }]}>Avg/month · from live Google Business Profile data</Text>
    </Card>
  );
}

/**
 * Performance tab body (design spec §10): honest GBP AI Impact banner,
 * metric tiles with real ▲N% only when a baseline exists, before/after bars
 * only with real data, the ✨ AI Actions feed and the weekly email summary
 * switch (default OFF, confirm before enabling).
 */
export function PerformancePanel({
  analytics,
  analyticsLoading,
  isConnected,
  connecting,
  onConnect,
  aiActions,
  onOpenPosts,
  userEmail,
}: {
  analytics: AnalyticsResult | null;
  analyticsLoading: boolean;
  isConnected: boolean;
  connecting: boolean;
  onConnect: () => void;
  aiActions: AiAction[];
  onOpenPosts: () => void;
  userEmail: string;
}) {
  const metrics = analytics?.metrics;
  const previous = analytics?.previousPeriod || null;
  const live = Boolean(analytics?.trendsAvailable && analytics?.isLiveGoogleApi);
  const hasBaseline = Boolean(previous && metrics);

  const viewsChange = hasBaseline && previous ? pctChange(metrics!.totalViews, previous.totalViews) : null;
  const callsChange = hasBaseline && previous ? pctChange(metrics!.callClicks, previous.callClicks) : null;
  const directionsChange = hasBaseline && previous ? pctChange(metrics!.directionRequests, previous.directionRequests) : null;

  const impactPct = viewsChange;

  // Weekly email summary (safe default: OFF, confirm before enabling)
  const [summaryEnabled, setSummaryEnabled] = useState(false);
  const [summaryEmail, setSummaryEmail] = useState('');
  const [summaryBusy, setSummaryBusy] = useState(false);
  const [summaryNotice, setSummaryNotice] = useState<string | null>(null);
  useEffect(() => {
    setSummaryEmail(userEmail);
  }, [userEmail]);

  async function toggleSummary(enabled: boolean) {
    setSummaryNotice(null);
    if (!enabled) {
      setSummaryEnabled(false);
      try {
        await apiRequest('/api/gbp/summary-settings', { method: 'POST', body: { enabled: false, email: summaryEmail } });
      } catch {
        // disabling is best-effort — the local switch already reflects OFF
      }
      return;
    }
    Alert.alert(
      'Enable weekly email summary?',
      'Every week we will email your GBP performance summary (views, calls, directions, reviews)' +
        (summaryEmail ? ` to ${summaryEmail}` : '') +
        '.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Enable',
          style: 'default',
          onPress: async () => {
            setSummaryBusy(true);
            try {
              await apiRequest('/api/gbp/summary-settings', {
                method: 'POST',
                body: { enabled: true, email: summaryEmail },
              });
              setSummaryEnabled(true);
              setSummaryNotice('Weekly GBP email summary enabled.');
            } catch (e: unknown) {
              setSummaryEnabled(false);
              if (e instanceof ApiError && e.statusCode === 404) {
                setSummaryNotice('Weekly email summaries are coming soon on this server.');
              } else {
                setSummaryNotice(e instanceof Error ? e.message : 'Could not save the weekly summary setting.');
              }
            } finally {
              setSummaryBusy(false);
            }
          },
        },
      ],
    );
  }

  return (
    <View style={{ gap: 12 }}>
      {/* KPI banner */}
      <View style={{ backgroundColor: colors.successSoft, borderRadius: 16, padding: 18, gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <MaterialIcons name="auto-awesome" size={15} color={colors.success} />
          <Text style={{ fontSize: 14, fontWeight: '800', color: colors.success }}>GBP — AI Impact</Text>
        </View>
        {hasBaseline && impactPct !== null ? (
          <>
            <Text style={{ fontSize: 38, fontWeight: '800', color: colors.ink, letterSpacing: -1 }}>
              {impactPct >= 0 ? '▲' : '▼'} {Math.abs(impactPct)}%
            </Text>
            <Text style={{ fontSize: 13, color: colors.muted }}>
              change in monthly GBP views since AI started
            </Text>
          </>
        ) : isConnected ? (
          <>
            <Text style={{ fontSize: 38, fontWeight: '800', color: colors.ink, letterSpacing: -1 }}>
              {Math.round(metrics?.responseRate ?? 0)}%
            </Text>
            <Text style={{ fontSize: 13, color: colors.muted }}>response rate across Google reviews</Text>
            <Text style={[ui.caption, { marginTop: 2 }]}>
              AI impact tracking begins after 2+ weeks of connected data — numbers are never estimated.
            </Text>
            {(metrics?.totalReviews ?? 0) > 0 ? (
              <Text style={ui.caption}>
                {metrics?.totalReviews} reviews · average {metrics?.avgRating?.toFixed?.(1) ?? '—'} ★
              </Text>
            ) : (
              <Text style={ui.caption}>No Google reviews collected yet.</Text>
            )}
          </>
        ) : (
          <>
            <Text style={{ fontSize: 38, fontWeight: '800', color: colors.ink, letterSpacing: -1 }}>—</Text>
            <Text style={{ fontSize: 13, color: colors.muted }}>Connect GBP to unlock performance data.</Text>
            <View style={{ marginTop: 4 }}>
              <Action label="Connect Google Business Profile" icon="login" onPress={onConnect} disabled={connecting} />
            </View>
          </>
        )}
      </View>

      {/* Metric tiles */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <MetricTile label="Views" value={metrics?.totalViews ?? 0} icon="visibility" live={live} changePct={viewsChange} />
        <MetricTile label="Calls" value={metrics?.callClicks ?? 0} icon="call" live={live} changePct={callsChange} />
        <MetricTile label="Directions" value={metrics?.directionRequests ?? 0} icon="directions" live={live} changePct={directionsChange} />
      </View>

      {/* Before/after chart — ONLY with a real baseline */}
      {hasBaseline && previous ? (
        <BeforeAfterChart
          before={[
            { label: 'Views', value: previous.totalViews },
            { label: 'Calls', value: previous.callClicks },
            { label: 'Directions', value: previous.directionRequests },
          ]}
          after={[
            { label: 'Views', value: metrics?.totalViews ?? 0 },
            { label: 'Calls', value: metrics?.callClicks ?? 0 },
            { label: 'Directions', value: metrics?.directionRequests ?? 0 },
          ]}
        />
      ) : isConnected ? (
        <Card style={{ gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <MaterialIcons name={live ? 'check-circle' : 'hourglass-empty'} size={15} color={live ? gbpColors.emerald : colors.muted} />
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink }}>
              {live ? 'Live Google data connected' : 'Trend comparison collecting data…'}
            </Text>
          </View>
          <Text style={ui.caption}>
            {live
              ? 'Your baseline period is being recorded — the Before/After AI chart appears once 2+ weeks of data exist.'
              : 'After Google records enough profile activity, week-over-week trends appear here. Numbers are never estimated.'}
          </Text>
        </Card>
      ) : null}

      {analyticsLoading && !analytics ? <ActivityIndicator color={colors.brand} style={{ padding: 8 }} /> : null}

      {/* AI Actions feed */}
      <View>
        <SectionHeader title="✨ AI Actions" icon="rocket-launch" iconColor={gbpColors.ai} />
        <AiActionsFeed actions={aiActions} onOpenPosts={onOpenPosts} />
      </View>

      {/* Weekly email summary */}
      <Card style={{ gap: 10 }}>
        <SectionHeader title="Weekly email summary" icon="mail-outline" />
        <Field
          label="Send summaries to"
          placeholder="you@business.com"
          value={summaryEmail}
          onChangeText={setSummaryEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink }}>Email me every Monday</Text>
            <Text style={ui.caption}>A weekly digest of views, calls, directions and new reviews.</Text>
          </View>
          <Switch
            accessibilityLabel="Enable weekly email summary"
            value={summaryEnabled}
            onValueChange={(v) => void toggleSummary(v)}
            disabled={summaryBusy}
            trackColor={{ true: colors.brand, false: colors.line }}
            thumbColor="#FFFFFF"
          />
        </View>
        {summaryBusy ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <ActivityIndicator size="small" color={colors.brand} />
            <Text style={ui.caption}>Saving…</Text>
          </View>
        ) : null}
        {summaryNotice ? <Text style={{ fontSize: 12, fontWeight: '600', color: colors.brand }}>{summaryNotice}</Text> : null}
      </Card>

      {!aiActions.length && isConnected ? (
        <Empty
          title="Performance is ramping up"
          detail="Once AI publishes replies, posts and photos, every action and its impact appears here."
        />
      ) : null}
    </View>
  );
}
