import React from 'react';
import { Text, View } from 'react-native';
import { colors, ui } from '../ui';
import { shortDate } from './bits';

/**
 * Dhanda-style Marketing Score speedometer implemented with plain RN Views
 * (react-native-svg is NOT a dependency of bgosmobile — zero new deps).
 *
 * Visual: a clipped semicircle holding the four score bands
 *   red 0–25 / orange 25–50 / yellow 50–75 / green 75–100,
 * an inner mask that leaves a ring, and a needle rotated with
 * `transformOrigin: '50% 100%'` (supported since RN 0.73) around the gauge
 * pivot at the bottom centre.
 */

export const SCORE_BANDS = [
  { color: '#EF4444', label: 'Poor' }, // 0–25
  { color: '#F59E0B', label: 'Average' }, // 25–50
  { color: '#EAB308', label: 'Good' }, // 50–75
  { color: '#10B981', label: 'Great' }, // 75–100
] as const;

export function bandIndexForScore(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(3, Math.floor(score / 25)));
}

/** Pill colouring that matches the band the score currently sits in. */
export function scoreBandColor(score: number | null | undefined): string {
  if (score == null || !Number.isFinite(score)) return colors.muted;
  return SCORE_BANDS[bandIndexForScore(score)].color;
}

export function Speedometer({
  score,
  size = 200,
  thickness = 18,
}: {
  /** 0–100. Values outside the range are clamped. */
  score: number;
  size?: number;
  thickness?: number;
}) {
  const clamped = Math.max(0, Math.min(100, score));
  const radius = size / 2;
  const innerSize = size - thickness * 2;
  const innerRadius = innerSize / 2;
  const needleLen = Math.max(24, innerRadius - 12);
  // 0% → -90° (left edge), 100% → +90° (right edge).
  const angle = -90 + (clamped / 100) * 180;

  return (
    <View
      accessibilityLabel={`Marketing score gauge: ${Math.round(clamped)} of 100`}
      style={{
        width: size,
        height: radius,
        borderTopLeftRadius: radius,
        borderTopRightRadius: radius,
        backgroundColor: '#F1F5F9',
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'flex-end',
      }}
    >
      {/* Four score bands, clipped by the semicircle above. */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, flexDirection: 'row' }}>
        {SCORE_BANDS.map((band) => (
          <View key={band.label} style={{ flex: 1, backgroundColor: band.color, opacity: 0.9 }} />
        ))}
      </View>

      {/* Inner mask → leaves a ring of `thickness`. */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: (size - innerSize) / 2,
          width: innerSize,
          height: innerRadius,
          borderTopLeftRadius: innerRadius,
          borderTopRightRadius: innerRadius,
          backgroundColor: colors.surface,
        }}
      />

      {/* Needle — rotated around the gauge pivot (bottom centre). */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: size / 2 - 2,
          width: 4,
          height: needleLen,
          borderRadius: 2,
          backgroundColor: colors.ink,
          transform: [{ rotate: `${angle}deg` }],
          transformOrigin: '50% 100%',
        }}
      />

      {/* Pivot hub */}
      <View
        style={{
          position: 'absolute',
          bottom: -7,
          left: size / 2 - 7,
          width: 14,
          height: 14,
          borderRadius: 7,
          backgroundColor: colors.ink,
          borderWidth: 2,
          borderColor: colors.surface,
        }}
      />
    </View>
  );
}

/**
 * "Growth in Marketing Score" — simple Views-based bar chart of the last N
 * daily snapshots (weekHistory). Zero new deps; honest when history is short.
 */
export function WeekScoreBars({
  history,
  height = 64,
}: {
  history: { date: string; score: number | null }[];
  height?: number;
}) {
  const points = (history || [])
    .filter((h) => h && h.date)
    .slice(-7)
    .map((h) => ({ label: shortDate(h.date), value: Number(h.score) || 0 }));
  const max = Math.max(10, ...points.map((p) => p.value));

  if (!points.length) {
    return (
      <Text style={[ui.caption, { textAlign: 'center', paddingVertical: 12 }]}>
        No score history yet — check back after your first day of tracking.
      </Text>
    );
  }

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', paddingTop: 6 }}>
      {points.map((p, idx) => {
        const last = idx === points.length - 1;
        const barH = Math.max(6, Math.round((p.value / max) * height));
        return (
          <View key={`${p.label}-${idx}`} style={{ alignItems: 'center', gap: 3, flex: 1 }}>
            <Text style={{ fontSize: 9, fontWeight: '700', color: last ? colors.brand : colors.muted }}>
              {Math.round(p.value)}%
            </Text>
            <View
              style={{
                width: 18,
                height: barH,
                borderRadius: 4,
                backgroundColor: last ? colors.brand : '#CBD5E1',
              }}
            />
            <Text style={{ fontSize: 8.5, color: colors.muted }} numberOfLines={1}>
              {p.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
