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

/**
 * "Google's Performance" Spline / Line chart matching Screenshot 08.55.28 (2):
 * Y-axis: 0, 2, 4, 6, 8, 10
 * Wavy smoothed line with peaks and valleys
 * Left date: 2026-09-26 | Right date: 2026-10-25
 */
export function PerformanceSplineChart({
  points,
  startDate = '2026-09-26',
  endDate = '2026-10-25',
}: {
  points?: number[];
  startDate?: string;
  endDate?: string;
}) {
  const chartHeight = 140;

  // Default wavy data points matching Screenshot 08.55.28 (2)
  const defaultWave = [3.0, 2.0, 5.0, 1.2, 0.0, 1.0, 4.0, 0.0, 5.0, 1.0, 1.0, 5.0, 0.5, 0.0, 4.0, 2.0, 4.0, 1.0, 2.5, 3.0, 1.5, 2.0, 0.0, 2.0, 0.0];
  const data = points && points.length > 0 ? points : defaultWave;
  const maxVal = 10.0;

  return (
    <View style={{ gap: 8, paddingVertical: 4 }}>
      {/* Grid with Y-axis numbers: 10, 8, 6, 4, 2, 0 */}
      <View style={{ height: chartHeight, justifyContent: 'space-between', paddingVertical: 4, position: 'relative' }}>
        {[10, 8, 6, 4, 2, 0].map((num) => (
          <View key={num} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 11, color: '#94A3B8', width: 20, textAlign: 'right' }}>
              {num}
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

        {/* Wavy segments container */}
        <View
          style={{
            position: 'absolute',
            left: 28,
            right: 8,
            top: 10,
            bottom: 12,
            flexDirection: 'row',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
          }}
        >
          {data.map((val, idx) => {
            const h = Math.max(3, Math.min(chartHeight - 24, (val / maxVal) * (chartHeight - 24)));
            const nextVal = data[idx + 1] ?? val;
            const isPeak = val >= 3.5;
            return (
              <View key={idx} style={{ flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                <View
                  style={{
                    width: 2.5,
                    height: h,
                    backgroundColor: '#2563EB',
                    borderTopLeftRadius: 2,
                    borderTopRightRadius: 2,
                    opacity: isPeak ? 1 : 0.85,
                  }}
                />
              </View>
            );
          })}
        </View>
      </View>

      {/* Date Range Labels at bottom */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingLeft: 28, paddingRight: 8, marginTop: 4 }}>
        <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '500' }}>{startDate}</Text>
        <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '500' }}>{endDate}</Text>
      </View>
    </View>
  );
}
