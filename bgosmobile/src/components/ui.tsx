import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';

export const colors = {
  background: '#F4FAF9',
  surface: '#FFFFFF',
  ink: '#070B2D',
  muted: '#60758A',
  line: '#E2E8F0',
  brand: '#007F73',
  accent: '#00BFAE',
  hero: '#003E43',
  soft: '#E6F5F3',
  softHover: '#D5EFEA',
  success: '#168557',
  successSoft: '#E6F9EF',
  danger: '#BA3547',
  dangerSoft: '#FFF1F0',
  note: '#FFFBEB',
  noteBorder: '#FDE68A',
  noteText: '#B45309',
};

export function Brand({ large = false, light = false }: { large?: boolean; light?: boolean }) {
  return (
    <View style={[ui.row, { gap: 8 }]}>
      <Image
        source={require('../../assets/brand-mark.png')}
        style={{ width: large ? 54 : 28, height: large ? 54 : 28, resizeMode: 'contain' }}
        accessibilityIgnoresInvertColors
      />
      <View>
        <Text style={{ fontSize: large ? 32 : 19, fontWeight: '800', color: light ? '#FFFFFF' : colors.ink, letterSpacing: -0.8 }}>
          BGOS
        </Text>
        {large ? (
          <Text style={{ fontSize: 11, fontWeight: '700', color: light ? '#99F6E4' : colors.brand, letterSpacing: 1.2 }}>
            BUSINESS GROWTH OS
          </Text>
        ) : null}
      </View>
    </View>
  );
}

import { useRouter } from 'expo-router';

export function Screen({
  title,
  subtitle,
  children,
  refreshing = false,
  onRefresh,
  rightAction,
  showBack,
  onBack,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void | Promise<unknown>;
  rightAction?: React.ReactNode;
  showBack?: boolean;
  onBack?: () => void;
}) {
  const router = useRouter();
  const [pulling, setPulling] = useState(false);
  const canBack = showBack !== undefined ? showBack : (onBack !== undefined || (router.canGoBack?.() ?? false));

  function handleBack() {
    if (onBack) {
      onBack();
    } else if (router.canGoBack?.()) {
      router.back();
    }
  }

  return (
    <SafeAreaView style={ui.screen} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={ui.content}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing || pulling}
                onRefresh={async () => {
                  setPulling(true);
                  try {
                    await onRefresh();
                  } finally {
                    setPulling(false);
                  }
                }}
                tintColor={colors.brand}
              />
            ) : undefined
          }
        >
          <View style={ui.topbar}>
            <View style={[ui.row, { gap: 10 }]}>
              {canBack ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Go back"
                  onPress={handleBack}
                  style={ui.backBtn}
                >
                  <MaterialIcons name="arrow-back" size={22} color={colors.ink} />
                </Pressable>
              ) : null}
              <Brand />
            </View>
            {rightAction || (
              <View style={ui.row}>
                <View style={[ui.statusDot, { backgroundColor: colors.accent }]} />
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.muted }}>Online</Text>
              </View>
            )}
          </View>
          <Text accessibilityRole="header" style={ui.title}>
            {title}
          </Text>
          {subtitle ? <Text style={ui.subtitle}>{subtitle}</Text> : <View style={{ height: 14 }} />}
          <View style={ui.stack}>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[ui.card, style]}>{children}</View>;
}

export function Action({
  label,
  onPress,
  disabled,
  secondary = false,
  danger = false,
  icon,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
  danger?: boolean;
  icon?: React.ComponentProps<typeof MaterialIcons>['name'];
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        ui.button,
        secondary && ui.secondary,
        danger && { backgroundColor: colors.dangerSoft, borderWidth: 1, borderColor: '#FFCCD0' },
        { opacity: disabled ? 0.45 : pressed ? 0.8 : 1 },
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        {icon ? (
          <MaterialIcons
            name={icon}
            size={18}
            color={danger ? colors.danger : secondary ? colors.brand : '#FFFFFF'}
          />
        ) : null}
        <Text
          style={[
            ui.buttonText,
            secondary && { color: colors.brand },
            danger && { color: colors.danger },
          ]}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

export function Chip({
  label,
  count,
  selected,
  onPress,
}: {
  label: string;
  count?: number | string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        ui.chip,
        selected && { backgroundColor: colors.brand, borderColor: colors.brand },
      ]}
    >
      <Text style={{ color: selected ? '#FFFFFF' : colors.muted, fontSize: 13, fontWeight: '600' }}>
        {label}
        {count !== undefined ? ` (${count})` : ''}
      </Text>
    </Pressable>
  );
}

export function Avatar({ name, size = 42 }: { name: string; size?: number }) {
  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((s) => s[0])
      .join('')
      .toUpperCase() || '?';
  return (
    <View style={[ui.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={{ color: colors.brand, fontWeight: '700', fontSize: size * 0.38 }}>{initials}</Text>
    </View>
  );
}

export function Badge({
  label,
  success = false,
  danger = false,
  accent = false,
}: {
  label: string;
  success?: boolean;
  danger?: boolean;
  accent?: boolean;
}) {
  const bg = danger
    ? colors.dangerSoft
    : success
    ? colors.successSoft
    : accent
    ? '#CCFBF1'
    : colors.soft;
  const textColor = danger
    ? colors.danger
    : success
    ? colors.success
    : accent
    ? '#0F766E'
    : colors.brand;

  return (
    <View style={{ backgroundColor: bg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
      <Text style={{ color: textColor, fontSize: 11, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

export function MetricCard({
  value,
  label,
  trend,
  trendPositive,
  icon,
}: {
  value: string | number;
  label: string;
  trend?: string;
  trendPositive?: boolean;
  icon?: React.ComponentProps<typeof MaterialIcons>['name'];
}) {
  return (
    <View style={[ui.card, { flex: 1, minWidth: '46%', padding: 16 }]}>
      <View style={[ui.row, { justifyContent: 'space-between' }]}>
        <Text style={ui.metric}>{value}</Text>
        {icon ? (
          <View style={[ui.iconTile, { width: 34, height: 34 }]}>
            <MaterialIcons name={icon} size={18} color={colors.brand} />
          </View>
        ) : null}
      </View>
      <View style={[ui.row, { justifyContent: 'space-between', marginTop: 4 }]}>
        <Text style={ui.caption}>{label}</Text>
        {trend ? (
          <Text
            style={{
              fontSize: 11,
              fontWeight: '700',
              color: trendPositive ? colors.success : colors.danger,
            }}
          >
            {trend}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export function MeterBar({
  label,
  current,
  max,
  unit = '',
}: {
  label: string;
  current: number;
  max: number;
  unit?: string;
}) {
  const pct = Math.min(100, Math.max(0, Math.round((current / (max || 1)) * 100)));
  return (
    <View style={{ gap: 6 }}>
      <View style={[ui.row, { justifyContent: 'space-between' }]}>
        <Text style={ui.label}>{label}</Text>
        <Text style={ui.caption}>
          {current.toLocaleString()} / {max.toLocaleString()} {unit} ({pct}%)
        </Text>
      </View>
      <View style={ui.meterTrack}>
        <View style={[ui.meterFill, { width: `${pct}%`, backgroundColor: pct > 90 ? colors.danger : colors.brand }]} />
      </View>
    </View>
  );
}

export function MenuRow({
  title,
  detail,
  icon = 'chevron-right',
  badge,
  onPress,
}: {
  title: string;
  detail?: string;
  icon?: React.ComponentProps<typeof MaterialIcons>['name'];
  badge?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [ui.menuRow, { opacity: pressed ? 0.7 : 1 }]}
    >
      <View style={ui.iconTile}>
        <MaterialIcons name={icon} size={22} color={colors.brand} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={ui.heading}>{title}</Text>
        {detail ? <Text style={ui.caption}>{detail}</Text> : null}
      </View>
      {badge ? <Badge label={badge} /> : null}
      <MaterialIcons name="chevron-right" size={20} color={colors.muted} />
    </Pressable>
  );
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={ui.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        {...props}
        style={[ui.input, props.multiline && { minHeight: 96, textAlignVertical: 'top' }, props.style]}
      />
    </View>
  );
}

export function Empty({
  title,
  detail,
  actionLabel,
  onAction,
}: {
  title: string;
  detail: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <Card style={{ alignItems: 'center', textAlign: 'center', paddingVertical: 28 }}>
      <View style={[ui.iconTile, { width: 56, height: 56, borderRadius: 28, marginBottom: 12 }]}>
        <MaterialIcons name="inbox" size={30} color={colors.brand} />
      </View>
      <Text style={[ui.heading, { fontSize: 17 }]}>{title}</Text>
      <Text style={[ui.body, { textAlign: 'center', maxWidth: 300, marginTop: 4 }]}>{detail}</Text>
      {actionLabel && onAction ? (
        <View style={{ marginTop: 14, width: '100%' }}>
          <Action label={actionLabel} onPress={onAction} />
        </View>
      ) : null}
    </Card>
  );
}

export function Loading() {
  return <ActivityIndicator accessibilityLabel="Loading" color={colors.brand} style={{ padding: 30 }} />;
}

export function ErrorNotice({ message, retry }: { message: string | null; retry?: () => void }) {
  return message ? (
    <View accessibilityRole="alert" style={ui.error}>
      <View style={[ui.row, { gap: 8 }]}>
        <MaterialIcons name="error-outline" size={20} color={colors.danger} />
        <Text style={{ color: colors.danger, flex: 1, lineHeight: 20, fontSize: 13, fontWeight: '500' }}>
          {message}
        </Text>
      </View>
      {retry ? <Action label="Try again" secondary onPress={retry} /> : null}
    </View>
  ) : null;
}

export function AudioScrubber({
  durationSec = 134,
  onPlay,
}: {
  durationSec?: number;
  onPlay?: () => void;
}) {
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<'1x' | '1.5x' | '2x'>('1x');
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <View style={[ui.card, { backgroundColor: colors.surface, padding: 14, gap: 10 }]}>
      <View style={[ui.row, { justifyContent: 'space-between' }]}>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setPlaying(!playing);
            onPlay?.();
          }}
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: colors.brand,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MaterialIcons name={playing ? 'pause' : 'play-arrow'} size={24} color="#FFFFFF" />
        </Pressable>

        <View style={{ flex: 1, marginHorizontal: 12 }}>
          <View style={ui.meterTrack}>
            <View style={[ui.meterFill, { width: playing ? '58%' : '20%', backgroundColor: colors.brand }]} />
          </View>
          <View style={[ui.row, { justifyContent: 'space-between', marginTop: 4 }]}>
            <Text style={{ fontSize: 11, color: colors.muted }}>{playing ? '01:18' : '00:00'}</Text>
            <Text style={{ fontSize: 11, color: colors.muted }}>{formatTime(durationSec)}</Text>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => setSpeed(speed === '1x' ? '1.5x' : speed === '1.5x' ? '2x' : '1x')}
          style={{
            backgroundColor: colors.soft,
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 8,
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.brand }}>{speed}</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function DialpadGrid({
  onDigit,
  onDelete,
  onCall,
}: {
  onDigit: (digit: string) => void;
  onDelete: () => void;
  onCall: () => void;
}) {
  const keys = [
    { num: '1', sub: '' },
    { num: '2', sub: 'ABC' },
    { num: '3', sub: 'DEF' },
    { num: '4', sub: 'GHI' },
    { num: '5', sub: 'JKL' },
    { num: '6', sub: 'MNO' },
    { num: '7', sub: 'PQRS' },
    { num: '8', sub: 'TUV' },
    { num: '9', sub: 'WXYZ' },
    { num: '*', sub: '' },
    { num: '0', sub: '+' },
    { num: '#', sub: '' },
  ];

  return (
    <View style={{ width: '100%', maxWidth: 320, alignSelf: 'center', gap: 14 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 14 }}>
        {keys.map((k) => (
          <Pressable
            key={k.num}
            accessibilityRole="button"
            onPress={() => onDigit(k.num)}
            style={({ pressed }) => [
              ui.dialKey,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Text style={{ fontSize: 24, fontWeight: '700', color: colors.ink }}>{k.num}</Text>
            {k.sub ? <Text style={{ fontSize: 9, fontWeight: '700', color: colors.muted }}>{k.sub}</Text> : null}
          </Pressable>
        ))}
      </View>
      <View style={[ui.row, { justifyContent: 'space-around', marginTop: 10 }]}>
        <View style={{ width: 62 }} />
        <Pressable
          accessibilityRole="button"
          onPress={onCall}
          style={({ pressed }) => [
            ui.dialCallButton,
            { opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <MaterialIcons name="call" size={28} color="#FFFFFF" />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={onDelete}
          style={({ pressed }) => [
            { width: 62, height: 62, alignItems: 'center', justifyContent: 'center' },
            { opacity: pressed ? 0.6 : 1 },
          ]}
        >
          <MaterialIcons name="backspace" size={24} color={colors.muted} />
        </Pressable>
      </View>
    </View>
  );
}

export const ui = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 18, paddingBottom: 40, maxWidth: 760, width: '100%', alignSelf: 'center' },
  topbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.brand },
  title: { fontSize: 26, fontWeight: '800', color: colors.ink, letterSpacing: -0.6 },
  subtitle: { fontSize: 13, lineHeight: 19, color: colors.muted, marginTop: 4, marginBottom: 18 },
  stack: { gap: 14 },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  heading: { fontSize: 15, fontWeight: '700', color: colors.ink },
  body: { fontSize: 14, lineHeight: 21, color: colors.muted },
  caption: { fontSize: 12, lineHeight: 17, color: colors.muted },
  metric: { fontSize: 28, fontWeight: '800', color: colors.ink, letterSpacing: -0.8 },
  label: { fontSize: 12, fontWeight: '600', color: colors.ink },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    padding: 12,
    minHeight: 48,
    backgroundColor: colors.surface,
    color: colors.ink,
    fontSize: 15,
  },
  button: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  buttonText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  secondary: { backgroundColor: colors.soft, borderWidth: 1, borderColor: colors.softHover },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  error: { padding: 14, backgroundColor: colors.dangerSoft, borderRadius: 12, gap: 10 },
  chip: {
    minHeight: 38,
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  avatar: {
    backgroundColor: colors.soft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.softHover,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  iconTile: {
    width: 42,
    height: 42,
    backgroundColor: colors.soft,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  meterTrack: {
    height: 8,
    backgroundColor: colors.line,
    borderRadius: 4,
    overflow: 'hidden',
  },
  meterFill: {
    height: '100%',
    borderRadius: 4,
  },
  dialKey: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialCallButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
