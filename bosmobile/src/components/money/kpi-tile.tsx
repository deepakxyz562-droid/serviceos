import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

/**
 * Vyapar-style stat tile used in the Sale Invoices / money dashboard header.
 *
 * Purely presentational: no state, no fetching, no press handling.
 */
export interface KpiTileProps {
  label: string;
  value: string;
  tone?: 'default' | 'positive' | 'negative' | 'warning';
  sub?: string;
}

const TONE_VALUE_COLORS: Record<NonNullable<KpiTileProps['tone']>, string> = {
  default: '#0f172a',
  positive: '#16a34a',
  negative: '#dc2626',
  warning: '#d97706',
};

const TONE_ACCENT_COLORS: Record<NonNullable<KpiTileProps['tone']>, string> = {
  default: '#e2e8f0',
  positive: '#bbf7d0',
  negative: '#fecaca',
  warning: '#fde68a',
};

export function KpiTile(props: KpiTileProps) {
  const { label, value, tone = 'default', sub } = props;
  return (
    <View
      style={[
        styles.card,
        { borderLeftColor: TONE_ACCENT_COLORS[tone] },
      ]}
    >
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.value, { color: TONE_VALUE_COLORS[tone] }]} numberOfLines={1}>
        {value}
      </Text>
      {sub ? (
        <Text style={styles.sub} numberOfLines={1}>
          {sub}
        </Text>
      ) : null}
    </View>
  );
}

export function KpiRow({ tiles }: { tiles: KpiTileProps[] }) {
  // More than 3 tiles: scroll horizontally instead of squeezing them.
  const scrollable = tiles.length > 3;

  if (scrollable) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.scroll}
      >
        {tiles.map((tile, index) => (
          <View key={`${tile.label}-${index}`} style={styles.scrollTile}>
            <KpiTile {...tile} />
          </View>
        ))}
      </ScrollView>
    );
  }

  return (
    <View style={styles.row}>
      {tiles.map((tile, index) => (
        <View key={`${tile.label}-${index}`} style={styles.rowTile}>
          <KpiTile {...tile} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  rowTile: {
    flex: 1,
    minWidth: 0,
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 16,
  },
  scrollTile: {
    width: 148,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderLeftWidth: 4,
    padding: 12,
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 20,
    fontWeight: '900',
    marginTop: 4,
    letterSpacing: -0.3,
  },
  sub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
});
