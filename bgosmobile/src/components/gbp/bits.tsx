import React from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, ui } from '../ui';

/**
 * GBP experience design tokens — adapted from the competitor reference to the
 * BGOS brand. The core palette (brand green, ink, line…) AND the AI accent
 * (aiPurple / aiPurpleSoft) live in ui.tsx `colors` — the single source of
 * truth; these are the AI/status accents used across the GBP screens only.
 */
export const gbpColors = {
  ai: colors.aiPurple, // AI Suggested / sparkle accent (#A855F7)
  aiDark: '#7E22CE',
  aiSoft: colors.aiPurpleSoft, // #F3E8FF
  aiBorder: '#E9D5FF',
  emerald: '#10B981', // connected / success
  emeraldSoft: '#E7F8F0',
  amber: '#F59E0B', // pending / scheduled
  amberSoft: '#FEF3C7',
  star: '#FBBF24', // rating stars
  connector: 'rgba(0,159,80,0.4)', // dashed timeline connector
};

/** "2h ago"-style relative date. Returns '' when date unknown — never fabricates. */
export function relativeDate(iso?: string | null): string {
  if (!iso) return '';
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '';
  const diff = Date.now() - t;
  if (diff < 0) {
    // future (scheduled)
    const ahead = -diff;
    const days = Math.round(ahead / 86400000);
    if (days <= 1) return 'Tomorrow';
    if (days < 14) return `In ${days}d`;
    return new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  }
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function shortDate(iso?: string | null): string {
  if (!iso) return '';
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '';
  return new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

/** Small status pill (connection badge, scheduled badge, etc.). */
export function Pill({
  label,
  bg,
  color,
  icon,
  border,
}: {
  label: string;
  bg: string;
  color: string;
  icon?: React.ComponentProps<typeof MaterialIcons>['name'];
  border?: string;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: bg,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
        borderWidth: border ? 1 : 0,
        borderColor: border || 'transparent',
      }}
    >
      {icon ? <MaterialIcons name={icon} size={13} color={color} /> : null}
      <Text style={{ color, fontSize: 11, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

/** Step circle used in the 5-step connect wizard + optimization timeline. */
export function StepCircle({
  state,
  n,
  size = 30,
}: {
  state: 'done' | 'active' | 'ai' | 'locked';
  n?: number;
  size?: number;
}) {
  const bg =
    state === 'done'
      ? gbpColors.emerald
      : state === 'active'
      ? colors.brand
      : state === 'ai'
      ? gbpColors.ai
      : colors.line;
  const iconColor = state === 'locked' ? colors.muted : '#FFFFFF';
  return (
    <View
      accessibilityLabel={state === 'done' ? 'Step complete' : undefined}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {state === 'done' ? (
        <MaterialIcons name="check" size={size * 0.55} color="#FFFFFF" />
      ) : state === 'ai' ? (
        <MaterialIcons name="auto-awesome" size={size * 0.55} color="#FFFFFF" />
      ) : (
        <Text style={{ color: iconColor, fontSize: size * 0.42, fontWeight: '800' }}>{n ?? ''}</Text>
      )}
    </View>
  );
}

/** Vertical dashed connector for the timeline (brand green at 40%). */
export function DashedConnector({ height = 26 }: { height?: number }) {
  return (
    <View
      style={{
        width: 0,
        height,
        marginLeft: 14,
        borderLeftWidth: 2,
        borderStyle: 'dashed',
        borderColor: gbpColors.connector,
      }}
    />
  );
}

/** Section header with optional right element ("AI Actions" etc.). */
export function SectionHeader({
  title,
  icon,
  iconColor,
  right,
}: {
  title: string;
  icon?: React.ComponentProps<typeof MaterialIcons>['name'];
  iconColor?: string;
  right?: React.ReactNode;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {icon ? <MaterialIcons name={icon} size={16} color={iconColor || colors.brand} /> : null}
        <Text style={{ fontSize: 16, fontWeight: '800', color: colors.ink }}>{title}</Text>
      </View>
      {right}
    </View>
  );
}

/** Purple AI action button ("Generate AI Reply ✨", "Create with AI ✨"). */
export function AiButton({
  label,
  onPress,
  disabled,
  loading,
  small,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  small?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled || !!loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: gbpColors.ai,
        borderRadius: 12,
        minHeight: small ? 38 : 48,
        paddingHorizontal: small ? 12 : 16,
        paddingVertical: small ? 8 : 12,
        opacity: disabled || loading ? 0.5 : pressed ? 0.85 : 1,
      })}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#FFFFFF" />
      ) : (
        <MaterialIcons name="auto-awesome" size={16} color="#FFFFFF" />
      )}
      <Text style={{ color: '#FFFFFF', fontSize: small ? 12 : 14, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}

/** Row of 5 rating stars. */
export function StarRow({ rating, size = 13 }: { rating: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 1 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <MaterialIcons
          key={i}
          name={i <= Math.round(rating) ? 'star' : 'star-border'}
          size={size}
          color={gbpColors.star}
        />
      ))}
    </View>
  );
}

/** Green rating pill: "5.0 ★★★★★". */
export function RatingPill({ rating }: { rating: number }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: colors.successSoft,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
      }}
    >
      <Text style={{ color: colors.success, fontSize: 12, fontWeight: '800' }}>{rating.toFixed(1)}</Text>
      <StarRow rating={rating} size={12} />
    </View>
  );
}

/** Small round avatar with the author's initial — brand green circle, white letter. */
export function InitialAvatar({ name, size = 40 }: { name: string; size?: number }) {
  const letter = (name || '?').trim().charAt(0).toUpperCase() || '?';
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.brand,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: size * 0.42 }}>{letter}</Text>
    </View>
  );
}

/** Segmented pills row used for chip filters ("Replied (n) / Pending (n)"). */
export function ChipRow({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, style]}>{children}</View>;
}

export { ui, colors };
