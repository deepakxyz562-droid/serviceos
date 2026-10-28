import React, { useEffect, useMemo, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View, ScrollView } from 'react-native';

/**
 * Pure-RN custom date-range bottom sheet (replaces a native date picker).
 * All date math lives in local pure helpers using LOCAL date components
 * (getFullYear / getMonth / getDate) so no UTC-shifted ISO slices can occur.
 */
export interface DateRange {
  /** ISO yyyy-mm-dd (local calendar day) */
  start: string;
  /** ISO yyyy-mm-dd (local calendar day) */
  end: string;
  label: string;
}

export type DateRangePreset = 'today' | 'yesterday' | 'this_week' | 'this_month' | 'last_month';

export interface DateRangeSheetProps {
  visible: boolean;
  onClose(): void;
  onApply(range: DateRange): void;
  /** ISO yyyy-mm-dd */
  initialStart?: string;
  /** ISO yyyy-mm-dd */
  initialEnd?: string;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** Monday-first weekday header labels. */
const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

const PRESET_KEYS: DateRangePreset[] = [
  'today', 'yesterday', 'this_week', 'this_month', 'last_month',
];

const PRESET_LABELS: Record<DateRangePreset, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  this_week: 'This Week',
  this_month: 'This Month',
  last_month: 'Last Month',
};

// ---------------------------------------------------------------------------
// Local pure date helpers (local timezone only — never use toISOString())
// ---------------------------------------------------------------------------

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Local Date → ISO yyyy-mm-dd built from local components. */
function toISO(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** ISO yyyy-mm-dd → local Date at midnight (parsed manually, not via Date(string) which is UTC). */
function parseISO(iso: string): Date {
  const parts = iso.split('-');
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  return new Date(y, m - 1, d);
}

function isValidISO(value: string | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = parseISO(value);
  return (
    date.getFullYear() === Number(value.slice(0, 4)) &&
    date.getMonth() + 1 === Number(value.slice(5, 7)) &&
    date.getDate() === Number(value.slice(8, 10))
  );
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** Monday-first index of the weekday (0 = Monday … 6 = Sunday). */
function mondayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

function formatFull(iso: string): string {
  const d = parseISO(iso);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

/** "12 Oct – 31 Oct 2026" / "28 Dec 2025 – 4 Jan 2026" / "12 Oct 2026". */
function formatRangeLabel(startISO: string, endISO: string): string {
  if (startISO === endISO) return formatFull(startISO);
  const start = parseISO(startISO);
  const end = parseISO(endISO);
  if (start.getFullYear() === end.getFullYear()) {
    return `${formatFull(startISO).slice(0, -5)} \u2013 ${formatFull(endISO)}`;
  }
  return `${formatFull(startISO)} \u2013 ${formatFull(endISO)}`;
}

/**
 * Compute a preset range from the real current date.
 * Exported so callers can use presets without opening the sheet.
 */
export function presetRange(
  key: 'today' | 'yesterday' | 'this_week' | 'this_month' | 'last_month',
): DateRange {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();

  switch (key) {
    case 'today': {
      const iso = toISO(new Date(y, m, d));
      return { start: iso, end: iso, label: PRESET_LABELS.today };
    }
    case 'yesterday': {
      const iso = toISO(new Date(y, m, d - 1));
      return { start: iso, end: iso, label: PRESET_LABELS.yesterday };
    }
    case 'this_week': {
      const monday = new Date(y, m, d - mondayIndex(now));
      const sunday = new Date(y, m, d - mondayIndex(now) + 6);
      return { start: toISO(monday), end: toISO(sunday), label: PRESET_LABELS.this_week };
    }
    case 'this_month':
      return {
        start: toISO(new Date(y, m, 1)),
        end: toISO(new Date(y, m + 1, 0)),
        label: PRESET_LABELS.this_month,
      };
    case 'last_month':
      return {
        start: toISO(new Date(y, m - 1, 1)),
        end: toISO(new Date(y, m, 0)),
        label: PRESET_LABELS.last_month,
      };
  }
}

// ---------------------------------------------------------------------------
// Sheet
// ---------------------------------------------------------------------------

export function DateRangeSheet(props: DateRangeSheetProps) {
  const { visible, onClose, onApply, initialStart, initialEnd } = props;

  const [monthStart, setMonthStart] = useState<Date>(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [startISO, setStartISO] = useState<string | null>(null);
  const [endISO, setEndISO] = useState<string | null>(null);
  const [presetKey, setPresetKey] = useState<DateRangePreset | null>(null);

  // Re-seed selection whenever the sheet opens.
  useEffect(() => {
    if (!visible) return;
    const s = isValidISO(initialStart) ? initialStart : null;
    const e = isValidISO(initialEnd) ? initialEnd : null;
    if (s) {
      const seed = parseISO(s);
      setStartISO(s);
      setEndISO(e && e >= s ? e : null);
      setMonthStart(new Date(seed.getFullYear(), seed.getMonth(), 1));
      setPresetKey(null);
    } else {
      const preset = presetRange('this_month');
      const seed = parseISO(preset.start);
      setStartISO(preset.start);
      setEndISO(preset.end);
      setMonthStart(new Date(seed.getFullYear(), seed.getMonth(), 1));
      setPresetKey('this_month');
    }
  }, [visible, initialStart, initialEnd]);

  const grid = useMemo(() => {
    const year = monthStart.getFullYear();
    const month = monthStart.getMonth();
    const total = daysInMonth(year, month);
    const offset = mondayIndex(new Date(year, month, 1));
    const cells: Array<number | null> = [];
    for (let i = 0; i < offset; i += 1) cells.push(null);
    for (let day = 1; day <= total; day += 1) cells.push(day);
    while (cells.length < 6 * 7) cells.push(null);
    return cells;
  }, [monthStart]);

  const canApply = !!startISO && !!endISO && startISO <= endISO;

  const handlePreset = (key: DateRangePreset) => {
    const range = presetRange(key);
    const seed = parseISO(range.start);
    setStartISO(range.start);
    setEndISO(range.end);
    setMonthStart(new Date(seed.getFullYear(), seed.getMonth(), 1));
    setPresetKey(key);
  };

  const handleDayPress = (iso: string) => {
    if (!startISO || (startISO && endISO)) {
      setStartISO(iso);
      setEndISO(null);
    } else if (iso < startISO) {
      // Tapped before the current start → restart the range from this day.
      setStartISO(iso);
      setEndISO(null);
    } else {
      setEndISO(iso);
    }
    setPresetKey(null);
  };

  const handleApply = () => {
    if (!startISO || !endISO || startISO > endISO) return;
    onApply({
      start: startISO,
      end: endISO,
      label: presetKey ? PRESET_LABELS[presetKey] : formatRangeLabel(startISO, endISO),
    });
    onClose();
  };

  const year = monthStart.getFullYear();
  const month = monthStart.getMonth();

  let hint = 'Tap a start date';
  if (startISO && !endISO) hint = 'Tap an end date';
  else if (startISO && endISO) hint = formatRangeLabel(startISO, endISO);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} accessibilityLabel="Close date range" accessibilityRole="button" />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Custom date range</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }} accessibilityRole="button" accessibilityLabel="Close">
              <Text style={styles.closeText}>{'\u2715'}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
            <View style={styles.presetRow}>
              {PRESET_KEYS.map((key) => {
                const selected = presetKey === key;
                return (
                  <TouchableOpacity
                    key={key}
                    onPress={() => handlePreset(key)}
                    hitSlop={{ top: 4, bottom: 4 }}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    style={[styles.presetChip, selected ? styles.presetChipSelected : styles.presetChipIdle]}
                  >
                    <Text style={[styles.presetText, selected ? styles.presetTextSelected : styles.presetTextIdle]}>
                      {PRESET_LABELS[key]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.monthNav}>
              <TouchableOpacity
                onPress={() => setMonthStart(new Date(year, month - 1, 1))}
                style={styles.navBtn}
                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                accessibilityRole="button"
                accessibilityLabel="Previous month"
              >
                <Text style={styles.navChevron}>{'\u2039'}</Text>
              </TouchableOpacity>
              <Text style={styles.monthLabel}>
                {MONTHS[month]} {year}
              </Text>
              <TouchableOpacity
                onPress={() => setMonthStart(new Date(year, month + 1, 1))}
                style={styles.navBtn}
                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                accessibilityRole="button"
                accessibilityLabel="Next month"
              >
                <Text style={styles.navChevron}>{'\u203A'}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.weekRow}>
              {WEEKDAYS.map((weekday) => (
                <Text key={weekday} style={styles.weekLabel}>
                  {weekday}
                </Text>
              ))}
            </View>

            {[0, 1, 2, 3, 4, 5].map((row) => (
              <View key={row} style={styles.gridRow}>
                {[0, 1, 2, 3, 4, 5, 6].map((col) => {
                  const day = grid[row * 7 + col];
                  if (day === null) return <View key={col} style={styles.dayCell} />;
                  const iso = toISO(new Date(year, month, day));
                  const isStart = iso === startISO;
                  const isEnd = iso === endISO;
                  const inRange = !!startISO && !!endISO && iso > startISO && iso < endISO;
                  const endpoint = isStart || isEnd;
                  return (
                    <TouchableOpacity
                      key={col}
                      onPress={() => handleDayPress(iso)}
                      hitSlop={{ top: 2, bottom: 2 }}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={formatFull(iso)}
                      accessibilityState={{ selected: endpoint }}
                      style={[styles.dayCell, inRange && styles.dayInRange, endpoint && styles.dayEndpoint]}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          inRange && styles.dayTextInRange,
                          endpoint && styles.dayTextEndpoint,
                        ]}
                      >
                        {day}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}

            <View style={styles.readoutRow}>
              <View style={styles.readout}>
                <Text style={styles.readoutLabel}>From</Text>
                <Text style={[styles.readoutValue, !startISO && styles.readoutPlaceholder]}>
                  {startISO ? formatFull(startISO) : 'Select'}
                </Text>
              </View>
              <View style={styles.readout}>
                <Text style={styles.readoutLabel}>To</Text>
                <Text style={[styles.readoutValue, !endISO && styles.readoutPlaceholder]}>
                  {endISO ? formatFull(endISO) : 'Select'}
                </Text>
              </View>
            </View>

            <Text style={styles.hint}>{hint}</Text>

            <TouchableOpacity
              onPress={handleApply}
              disabled={!canApply}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityState={{ disabled: !canApply }}
              style={[styles.applyBtn, !canApply && styles.applyBtnDisabled]}
            >
              <Text style={[styles.applyText, !canApply && styles.applyTextDisabled]}>Apply Custom Range</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#64748b',
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  presetChip: {
    minHeight: 36,
    borderRadius: 999,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetChipSelected: {
    backgroundColor: '#0f172a',
  },
  presetChipIdle: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  presetText: {
    fontSize: 12,
    fontWeight: '700',
  },
  presetTextSelected: {
    color: '#ffffff',
    fontWeight: '800',
  },
  presetTextIdle: {
    color: '#0f172a',
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  navBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navChevron: {
    fontSize: 22,
    fontWeight: '800',
    color: '#475569',
    marginTop: -2,
  },
  monthLabel: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0f172a',
  },
  weekRow: {
    flexDirection: 'row',
    marginTop: 10,
  },
  weekLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  gridRow: {
    flexDirection: 'row',
  },
  dayCell: {
    flex: 1,
    height: 40,
    marginHorizontal: 1,
    marginVertical: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayInRange: {
    backgroundColor: '#f1f5f9',
    borderRadius: 0,
  },
  dayEndpoint: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
  },
  dayText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  dayTextInRange: {
    color: '#0f172a',
    fontWeight: '700',
  },
  dayTextEndpoint: {
    color: '#ffffff',
    fontWeight: '900',
  },
  readoutRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  readout: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 44,
  },
  readoutLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  readoutValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 2,
  },
  readoutPlaceholder: {
    color: '#94a3b8',
    fontWeight: '600',
  },
  hint: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 8,
    textAlign: 'center',
  },
  applyBtn: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  applyBtnDisabled: {
    backgroundColor: '#e2e8f0',
  },
  applyText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  applyTextDisabled: {
    color: '#94a3b8',
  },
});
