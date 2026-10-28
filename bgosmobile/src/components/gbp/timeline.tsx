import React, { useState } from 'react';
import { ActivityIndicator, Pressable, Switch, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Action, colors, ui } from '../ui';
import { DashedConnector, StepCircle, gbpColors, relativeDate, shortDate } from './bits';
import type { AutomationKey, GbpAutomations } from './automations';
import type { AuditCheck, AuditResult, GbpPlaceResult } from './types';

export type TimelineCounts = {
  replies: number;
  repliesWhen: string | null;
  posts: number;
  postsWhen: string | null;
  photos: number;
  photosWhen: string | null;
};

/** Expandable vertical-timeline card (dashed brand-green spine, spec §5). */
function TimelineGroup({
  icon,
  iconColor,
  iconBg,
  title,
  right,
  expanded,
  onToggle,
  locked,
  children,
}: {
  icon?: React.ComponentProps<typeof MaterialIcons>['name'];
  iconColor?: string;
  iconBg?: string;
  title: string;
  right?: React.ReactNode;
  expanded: boolean;
  onToggle?: () => void;
  locked?: boolean;
  children?: React.ReactNode;
}) {
  const body = children ? (
    <View
      style={{
        backgroundColor: colors.background,
        borderRadius: 10,
        padding: 12,
        marginTop: 10,
        gap: 9,
      }}
    >
      {children}
    </View>
  ) : null;

  if (!onToggle) {
    return (
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: colors.line,
          padding: 14,
          marginLeft: 42,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <Text style={{ flex: 1, fontSize: 13.5, fontWeight: '700', color: colors.ink }}>{title}</Text>
          {right}
        </View>
        {body}
      </View>
    );
  }

  return (
    <View style={{ marginLeft: 42 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        disabled={locked}
        onPress={onToggle}
        style={({ pressed }) => ({
          backgroundColor: colors.surface,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: colors.line,
          padding: 14,
          opacity: pressed ? 0.9 : 1,
        })}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {icon ? (
            <View
              style={{
                width: 26,
                height: 26,
                borderRadius: 8,
                backgroundColor: iconBg || colors.soft,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MaterialIcons name={icon} size={15} color={iconColor || colors.brand} />
            </View>
          ) : null}
          <Text style={{ flex: 1, fontSize: 13.5, fontWeight: '700', color: colors.ink }}>{title}</Text>
          {right}
          <MaterialIcons name={expanded ? 'expand-less' : 'expand-more'} size={18} color={colors.muted} />
        </View>
        {expanded ? body : null}
      </Pressable>
    </View>
  );
}

function CheckRow({ check }: { check: AuditCheck }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
      <MaterialIcons
        name={check.passed ? 'check-circle' : 'radio-button-unchecked'}
        size={15}
        color={check.passed ? gbpColors.emerald : colors.line}
        style={{ marginTop: 2 }}
      />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 12.5, fontWeight: '600', color: colors.ink }}>{check.label}</Text>
        {check.currentValue ? <Text style={{ fontSize: 11, color: colors.muted }}>{check.currentValue}</Text> : null}
      </View>
    </View>
  );
}

const AUTOMATION_ITEMS: { key: AutomationKey; label: string }[] = [
  { key: 'replyToReviews', label: 'Auto reply to reviews' },
  { key: 'generatePosts', label: 'Auto generate Posts' },
  { key: 'postingSchedule', label: 'Configure posting schedule' },
  { key: 'mediaSchedule', label: 'Configure media schedule' },
];

function CountPill({ n, when }: { n: number; when: string | null }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      {when ? <Text style={{ fontSize: 11, color: colors.muted }}>{shortDate(when)}</Text> : null}
      <View
        style={{
          backgroundColor: n > 0 ? colors.brandSoft : colors.background,
          borderRadius: 999,
          paddingHorizontal: 8,
          paddingVertical: 3,
          minWidth: 26,
          alignItems: 'center',
        }}
      >
        <Text style={{ fontSize: 11, fontWeight: '800', color: n > 0 ? colors.brandDark : colors.muted }}>+{n}</Text>
      </View>
    </View>
  );
}

/**
 * Optimization Timeline (design spec §5) — the "AI agent at work" spine.
 * Every group reflects REAL state: connected place, audit checks, persisted
 * automation toggles, and live post/reply/photo counts with real dates.
 */
export function OptimizationTimeline({
  audit,
  place,
  businessName,
  counts,
  automations,
  onToggleAutomation,
  onRunSeo,
  seoBusy,
  loadingAudit,
}: {
  audit: AuditResult | null;
  place: GbpPlaceResult | null;
  businessName: string;
  counts: TimelineCounts;
  automations: GbpAutomations;
  onToggleAutomation: (key: AutomationKey, value: boolean) => void;
  onRunSeo: () => void;
  seoBusy: boolean;
  loadingAudit: boolean;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const checks = audit?.checks || [];
  const passed = checks.filter((c) => c.passed);
  const failed = checks.filter((c) => !c.passed);
  const recommendations = audit?.recommendations || [];

  const toggle = (id: string) => setExpanded((prev) => (prev === id ? null : id));
  const allAutomationsOn = AUTOMATION_ITEMS.every((a) => automations[a.key]);
  const activeAutomations = AUTOMATION_ITEMS.filter((a) => automations[a.key]).length;

  if (loadingAudit && !audit) {
    return (
      <View style={{ alignItems: 'center', padding: 18 }}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  return (
    <View>
      {/* 1 · Google Business Profile — done (connection date from place data) */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <StepCircle state="done" size={30} />
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 14, fontWeight: '800', color: colors.ink }}>Google Business Profile</Text>
        </View>
        <Text style={{ fontSize: 11, fontWeight: '700', color: gbpColors.emerald }}>
          Connected ✓
        </Text>
      </View>
      <DashedConnector />
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: colors.line,
          padding: 14,
          marginLeft: 42,
          gap: 6,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <MaterialIcons name="storefront" size={16} color={colors.brand} />
          <Text style={{ flex: 1, fontSize: 13.5, fontWeight: '700', color: colors.ink }} numberOfLines={1}>
            {businessName}
          </Text>
          {place?.place?.isVerified ? (
            <Text style={{ fontSize: 11, fontWeight: '800', color: gbpColors.emerald }}>✓ Verified</Text>
          ) : null}
        </View>
        {place?.place?.address ? (
          <Text style={{ fontSize: 12, color: colors.muted }} numberOfLines={1}>
            {place.place.address}
          </Text>
        ) : null}
        {place?.place?.category ? (
          <View style={{ alignSelf: 'flex-start', backgroundColor: colors.soft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.brandDark }}>{place.place.category}</Text>
          </View>
        ) : null}
      </View>

      <DashedConnector />

      {/* 2 · Analyse Business — real audit checks */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <StepCircle state="done" size={30} />
        <Text style={{ flex: 1, fontSize: 14, fontWeight: '800', color: colors.ink }}>Analyse Business</Text>
        <View
          style={{
            backgroundColor: gbpColors.emeraldSoft,
            borderRadius: 999,
            paddingHorizontal: 8,
            paddingVertical: 3,
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: '800', color: gbpColors.emerald }}>
            ✓ {audit ? `${audit.score}% · Grade ${audit.grade}` : 'Analysing'}
          </Text>
        </View>
      </View>
      <DashedConnector />
      <TimelineGroup
        title={`${passed.length} of ${checks.length} local-ranking checks passed`}
        expanded={expanded === 'analyse'}
        onToggle={() => toggle('analyse')}
      >
        {passed.map((c) => (
          <CheckRow key={c.id} check={c} />
        ))}
        {passed.length === 0 ? (
          <Text style={{ fontSize: 12, color: colors.muted }}>No checks passed yet — start with the gaps below.</Text>
        ) : null}
      </TimelineGroup>

      <DashedConnector />

      {/* 3 · Setup Automations — REAL persisted toggles (default OFF) */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <StepCircle state={allAutomationsOn ? 'done' : 'active'} n={3} size={30} />
        <Text style={{ flex: 1, fontSize: 14, fontWeight: '800', color: colors.ink }}>Setup Automations</Text>
        <Text style={{ fontSize: 11, fontWeight: '700', color: allAutomationsOn ? gbpColors.emerald : colors.muted }}>
          {activeAutomations}/{AUTOMATION_ITEMS.length} on
        </Text>
      </View>
      <DashedConnector />
      <TimelineGroup
        title="AI automation switches"
        expanded={expanded === 'automations'}
        onToggle={() => toggle('automations')}
        right={
          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.muted }}>
            {allAutomationsOn ? 'All on' : 'Tap to configure'}
          </Text>
        }
      >
        {AUTOMATION_ITEMS.map((item) => (
          <View key={item.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <MaterialIcons
              name={automations[item.key] ? 'check-circle' : 'radio-button-unchecked'}
              size={15}
              color={automations[item.key] ? gbpColors.emerald : colors.line}
            />
            <Text style={{ flex: 1, fontSize: 12.5, fontWeight: '600', color: colors.ink }}>{item.label}</Text>
            <Switch
              accessibilityLabel={item.label}
              value={automations[item.key]}
              onValueChange={(v) => onToggleAutomation(item.key, v)}
              trackColor={{ true: colors.brand, false: colors.line }}
              thumbColor="#FFFFFF"
              style={{ transform: [{ scale: 0.82 }] }}
            />
          </View>
        ))}
        <Text style={{ fontSize: 10.5, color: colors.muted }}>
          Automations stay OFF until you enable them. Settings are saved on this device.
        </Text>
      </TimelineGroup>

      <DashedConnector />

      {/* 4 · Optimisations Planned — real audit recommendations (purple sparkle) */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <StepCircle state={failed.length > 0 ? 'ai' : 'done'} size={30} />
        <Text style={{ flex: 1, fontSize: 14, fontWeight: '800', color: colors.ink }}>Optimisations Planned</Text>
        {failed.length > 0 ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              backgroundColor: gbpColors.aiSoft,
              borderWidth: 1,
              borderColor: gbpColors.aiBorder,
              borderRadius: 999,
              paddingHorizontal: 8,
              paddingVertical: 3,
            }}
          >
            <MaterialIcons name="auto-awesome" size={11} color={gbpColors.ai} />
            <Text style={{ fontSize: 11, fontWeight: '800', color: gbpColors.aiDark }}>{failed.length} planned</Text>
          </View>
        ) : (
          <Text style={{ fontSize: 11, fontWeight: '800', color: gbpColors.emerald }}>✓ All clear</Text>
        )}
      </View>
      <DashedConnector />
      <TimelineGroup
        title={failed.length > 0 ? `✨ AI plan for ${businessName}` : 'Nothing left to plan'}
        expanded={expanded === 'planned'}
        onToggle={() => toggle('planned')}
      >
        {failed.length > 0 ? (
          <>
            {failed.map((c) => (
              <View key={c.id} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                <Text style={{ color: gbpColors.ai, fontSize: 14, fontWeight: '800', lineHeight: 18 }}>•</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.ink }}>{c.label}</Text>
                  <Text style={{ fontSize: 11.5, lineHeight: 16, color: colors.muted }}>{c.recommendation}</Text>
                </View>
              </View>
            ))}
            <Action label={seoBusy ? 'Optimizing…' : 'Run 1-click AI SEO optimiser ✨'} onPress={onRunSeo} disabled={seoBusy} />
          </>
        ) : recommendations.length > 0 ? (
          recommendations.map((r) => (
            <View key={r} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
              <Text style={{ color: gbpColors.ai, fontSize: 14, fontWeight: '800', lineHeight: 18 }}>•</Text>
              <Text style={{ flex: 1, fontSize: 12.5, color: colors.muted }}>{r}</Text>
            </View>
          ))
        ) : (
          <Text style={{ fontSize: 12, color: colors.muted }}>
            Profile fully optimized — AI keeps it fresh with posts, photos and replies.
          </Text>
        )}
      </TimelineGroup>

      <DashedConnector />

      {/* 5-7 · Real activity groups: Review Replies / Posts / Photos */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <StepCircle state="active" n={5} size={30} />
        <Text style={{ flex: 1, fontSize: 14, fontWeight: '800', color: colors.ink }}>Live Activity</Text>
      </View>
      <DashedConnector />
      <TimelineGroup
        icon="chat-bubble"
        iconColor={gbpColors.emerald}
        iconBg={gbpColors.emeraldSoft}
        title="Review Replies"
        expanded={expanded === 'replies'}
        onToggle={() => toggle('replies')}
        right={<CountPill n={counts.replies} when={counts.repliesWhen} />}
      >
        <Text style={{ fontSize: 12.5, color: colors.muted }}>
          {counts.replies > 0
            ? `${counts.replies} review repl${counts.replies === 1 ? 'y' : 'ies'} sent · latest ${relativeDate(counts.repliesWhen)}`
            : 'No replies sent yet — open the Reviews tab and let AI answer your first review.'}
        </Text>
      </TimelineGroup>
      <DashedConnector />
      <TimelineGroup
        icon="article"
        iconColor={gbpColors.emerald}
        iconBg={gbpColors.emeraldSoft}
        title="Posts"
        expanded={expanded === 'posts'}
        onToggle={() => toggle('posts')}
        right={<CountPill n={counts.posts} when={counts.postsWhen} />}
      >
        <Text style={{ fontSize: 12.5, color: colors.muted }}>
          {counts.posts > 0
            ? `${counts.posts} post${counts.posts === 1 ? '' : 's'} on your profile · latest ${relativeDate(counts.postsWhen)}`
            : 'No posts yet — AI writes 1-2 SEO posts per week from the Posts tab.'}
        </Text>
      </TimelineGroup>
      <DashedConnector />
      <TimelineGroup
        icon="photo"
        iconColor={gbpColors.emerald}
        iconBg={gbpColors.emeraldSoft}
        title="Photos"
        expanded={expanded === 'photos'}
        onToggle={() => toggle('photos')}
        right={<CountPill n={counts.photos} when={counts.photosWhen} />}
      >
        <Text style={{ fontSize: 12.5, color: colors.muted }}>
          {counts.photos > 0
            ? `${counts.photos} photo${counts.photos === 1 ? '' : 's'} published · latest ${relativeDate(counts.photosWhen)}`
            : 'No photos published yet — bulk-upload from the Photos tab and AI drips them daily.'}
        </Text>
      </TimelineGroup>

      {audit && audit.missingCount > 0 ? (
        <View style={{ marginTop: 10, marginLeft: 42 }}>
          <Text style={ui.caption}>
            {audit.missingCount} profile gap{audit.missingCount === 1 ? '' : 's'} remaining · AI works through the plan above.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/** "Optimizing" pill with spinner for the timeline section header. */
export function OptimizingPill() {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: colors.brandSoft,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 5,
      }}
    >
      <ActivityIndicator size="small" color={colors.brand} />
      <Text style={{ fontSize: 11, fontWeight: '800', color: colors.brand }}>Optimizing</Text>
    </View>
  );
}
