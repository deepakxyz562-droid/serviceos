import React from 'react';
import { Dimensions, Text, View } from 'react-native';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * "Growth in Marketing Score" weekly line chart matching Screenshot 08.55.28 (1):
 * Y-axis: 0%, 25%, 50%, 75%, 100%
 * X-axis: Sun, Mon, Tue, Wed, Thu, Fri, Sat
 * Prominent blue nodes and connecting line.
 */
export function WeeklyScoreLineChart({
  history,
  filterLabel = 'This Week',
  hideHeader = false,
}: {
  history?: { date: string; score: number | null }[];
  filterLabel?: string;
  hideHeader?: boolean;
}) {
  const chartHeight = 130;

  // Derive scores for each day of the current week (or fallback to real trend)
  const scoresByDay = React.useMemo(() => {
    const map: Record<string, number> = {
      Sun: 0,
      Mon: 0,
      Tue: 0,
      Wed: 0,
      Thu: 0,
      Fri: 0,
      Sat: 0,
    };

    if (history && history.length > 0) {
      history.slice(-7).forEach((h) => {
        try {
          const d = new Date(h.date);
          const dayName = DAYS[d.getDay()];
          map[dayName] = Math.max(0, Math.min(100, Math.round(Number(h.score) || 0)));
        } catch {}
      });
    }

    return DAYS.map((d) => ({ day: d, score: map[d] || 0 }));
  }, [history]);

  return (
    <View style={{ gap: 10, paddingVertical: 4 }}>
      {/* Title & Filter Header (hidden if parent container already shows it) */}
      {!hideHeader && (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>
            Growth in Marketing Score
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={{ fontSize: 13, color: '#E11D48' }}>🔻</Text>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#E11D48' }}>{filterLabel}</Text>
          </View>
        </View>
      )}

      {/* Grid with Y-axis percentages: 100%, 75%, 50%, 25%, 0% */}
      <View style={{ height: chartHeight, justifyContent: 'space-between', paddingVertical: 4, position: 'relative' }}>
        {[100, 75, 50, 25, 0].map((pct) => (
          <View key={pct} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 10, color: '#94A3B8', width: 34, textAlign: 'right' }}>
              {pct}%
            </Text>
            <View
              style={{
                flex: 1,
                height: 1,
                borderBottomWidth: 1,
                borderBottomColor: '#F1F5F9',
                borderStyle: 'dashed',
              }}
            />
          </View>
        ))}

        {/* Connecting line and Day Nodes across the bottom */}
        <View
          style={{
            position: 'absolute',
            left: 42,
            right: 8,
            bottom: 4,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Continuous blue line */}
          <View
            style={{
              position: 'absolute',
              left: 4,
              right: 4,
              height: 2.5,
              backgroundColor: '#2563EB',
              top: 6,
            }}
          />

          {scoresByDay.map(({ day, score }) => (
            <View key={day} style={{ alignItems: 'center', zIndex: 2 }}>
              <View
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 7,
                  backgroundColor: '#2563EB',
                  borderWidth: 2.5,
                  borderColor: '#FFFFFF',
                  shadowColor: '#2563EB',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.2,
                  shadowRadius: 2,
                }}
              />
              <Text style={{ fontSize: 10.5, fontWeight: '600', color: '#64748B', marginTop: 6 }}>
                {day}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

function formatCompactTick(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 10_000) return `${Math.round(n / 1_000)}k`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}k`;
  return String(n);
}

function buildYAxisTicks(rawMax: number): { ticks: number[]; maxVal: number } {
  if (rawMax <= 4) {
    return { ticks: [4, 3, 2, 1, 0], maxVal: 4 };
  }
  const roughStep = rawMax / 4;
  const mag = Math.pow(10, Math.floor(Math.log10(Math.max(1, roughStep))));
  const norm = roughStep / mag;
  const mult = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  const step = Math.max(1, Math.ceil(mult * mag));
  const maxVal = step * 4;
  return {
    ticks: [step * 4, step * 3, step * 2, step, 0],
    maxVal,
  };
}

/**
 * Dynamically scaled trend chart for Google Performance metrics.
 * Scales Y-axis ticks automatically to the dataset and renders an honest
 * empty state when there is no telemetry yet (zero fabricated wave data).
 */
export function PerformanceSplineChart({
  points,
  labels,
  startDate,
  endDate,
  accentColor = '#1A73E8',
  emptyTitle = 'No Google activity recorded yet',
  emptySubtitle = 'Search views, calls, and actions will chart here once synced.',
}: {
  points?: number[];
  labels?: string[];
  startDate?: string;
  endDate?: string;
  accentColor?: string;
  emptyTitle?: string;
  emptySubtitle?: string;
}) {
  const chartHeight = 136;
  const data = Array.isArray(points)
    ? points.map((v) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0))
    : [];
  const hasActivity = data.some((v) => v > 0);

  if (data.length === 0 || !hasActivity) {
    return (
      <View
        style={{
          minHeight: 112,
          borderRadius: 12,
          backgroundColor: '#F8FAFC',
          borderWidth: 1,
          borderColor: '#E2E8F0',
          borderStyle: 'dashed',
          paddingHorizontal: 16,
          paddingVertical: 18,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
        }}
      >
        <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569', textAlign: 'center' }}>
          {emptyTitle}
        </Text>
        <Text style={{ fontSize: 11.5, color: '#64748B', textAlign: 'center', lineHeight: 16 }}>
          {emptySubtitle}
        </Text>
      </View>
    );
  }

  const rawMax = Math.max(...data, 1);
  const { ticks, maxVal } = buildYAxisTicks(rawMax);
  const peakVal = Math.max(...data);
  const barWidth = data.length <= 7 ? 20 : data.length <= 14 ? 10 : 4;
  const hasPerPointLabels = Array.isArray(labels) && labels.length === data.length;

  return (
    <View style={{ gap: 6, paddingVertical: 2 }}>
      <View style={{ height: chartHeight, justifyContent: 'space-between', paddingVertical: 4, position: 'relative' }}>
        {ticks.map((num, idx) => (
          <View key={`${num}-${idx}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 10.5, color: '#94A3B8', width: 32, textAlign: 'right', fontWeight: '600' }}>
              {formatCompactTick(num)}
            </Text>
            <View
              style={{
                flex: 1,
                height: 1,
                borderBottomWidth: 1,
                borderBottomColor: idx === ticks.length - 1 ? '#CBD5E1' : '#F1F5F9',
                borderStyle: idx === ticks.length - 1 ? 'solid' : 'dashed',
              }}
            />
          </View>
        ))}

        {/* Dynamic Scaled Bars */}
        <View
          style={{
            position: 'absolute',
            left: 40,
            right: 6,
            top: 10,
            bottom: 8,
            flexDirection: 'row',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
          }}
        >
          {data.map((val, idx) => {
            const usableHeight = chartHeight - 28;
            const barHeight = val > 0 ? Math.max(6, Math.round((val / maxVal) * usableHeight)) : 3;
            const isPeak = val === peakVal && val > 0;
            return (
              <View key={idx} style={{ flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end', gap: 3 }}>
                {isPeak ? (
                  <Text style={{ fontSize: 10, fontWeight: '800', color: accentColor }} numberOfLines={1}>
                    {formatCompactTick(val)}
                  </Text>
                ) : null}
                <View
                  style={{
                    width: barWidth,
                    height: barHeight,
                    backgroundColor: val === 0 ? '#E2E8F0' : accentColor,
                    opacity: val === 0 ? 0.7 : isPeak ? 1 : 0.42,
                    borderTopLeftRadius: Math.min(6, barWidth / 2),
                    borderTopRightRadius: Math.min(6, barWidth / 2),
                    borderBottomLeftRadius: val === 0 ? 2 : 0,
                    borderBottomRightRadius: val === 0 ? 2 : 0,
                  }}
                />
              </View>
            );
          })}
        </View>
      </View>

      {/* Real X-Axis Month / Range Labels */}
      {hasPerPointLabels ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingLeft: 40, paddingRight: 6 }}>
          {labels!.map((lbl, idx) => (
            <Text
              key={`${lbl}-${idx}`}
              style={{
                flex: 1,
                textAlign: 'center',
                fontSize: 10.5,
                color: data[idx] === peakVal && peakVal > 0 ? '#0F172A' : '#64748B',
                fontWeight: data[idx] === peakVal && peakVal > 0 ? '700' : '500',
              }}
              numberOfLines={1}
            >
              {lbl}
            </Text>
          ))}
        </View>
      ) : startDate || endDate ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingLeft: 40, paddingRight: 6 }}>
          <Text style={{ fontSize: 10.5, color: '#64748B', fontWeight: '500' }}>{startDate || ''}</Text>
          <Text style={{ fontSize: 10.5, color: '#64748B', fontWeight: '500' }}>{endDate || ''}</Text>
        </View>
      ) : null}
    </View>
  );
}
