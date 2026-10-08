import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  Rect,
  Circle,
  Path,
  G,
} from 'react-native-svg';

interface NuvoraMarkProps {
  size?: number;
  showText?: boolean;
  subtitle?: string;
  variant?: 'dark' | 'light';
}

export function NuvoraMark({
  size = 56,
  showText = false,
  subtitle = 'Business Management OS',
  variant = 'dark',
}: NuvoraMarkProps) {
  const isDark = variant === 'dark';

  return (
    <View style={styles.container}>
      {/* The Geometric Nuvora Vector Glyph */}
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size} viewBox="0 0 1024 1024">
          <Defs>
            <LinearGradient id="bgBox" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#1E1B4B" />
              <Stop offset="50%" stopColor="#0F172A" />
              <Stop offset="100%" stopColor="#090D16" />
            </LinearGradient>

            <RadialGradient id="glowRing" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#6366F1" stopOpacity="0.4" />
              <Stop offset="70%" stopColor="#10B981" stopOpacity="0.15" />
              <Stop offset="100%" stopColor="#090D16" stopOpacity="0" />
            </RadialGradient>

            <LinearGradient id="leftBar" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#818CF8" />
              <Stop offset="100%" stopColor="#4F46E5" />
            </LinearGradient>

            <LinearGradient id="diagBridge" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#C084FC" />
              <Stop offset="45%" stopColor="#6366F1" />
              <Stop offset="75%" stopColor="#06B6D4" />
              <Stop offset="100%" stopColor="#10B981" />
            </LinearGradient>

            <LinearGradient id="rightBar" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#34D399" />
              <Stop offset="100%" stopColor="#059669" />
            </LinearGradient>

            <LinearGradient id="sheen" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.4" />
              <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </LinearGradient>
          </Defs>

          {/* Rounded base badge */}
          <Rect width="1024" height="1024" rx="240" fill="url(#bgBox)" />
          <Circle cx="512" cy="512" r="420" fill="url(#glowRing)" />
          <Rect
            x="12"
            y="12"
            width="1000"
            height="1000"
            rx="232"
            fill="none"
            stroke="#6366F1"
            strokeOpacity="0.3"
            strokeWidth="8"
          />

          {/* Glyph */}
          <G transform="translate(512, 512) scale(1.02) translate(-512, -512)">
            {/* Left upright */}
            <Rect x="250" y="270" width="124" height="484" rx="44" fill="url(#leftBar)" />
            <Rect x="256" y="276" width="36" height="230" rx="18" fill="url(#sheen)" />

            {/* Dynamic sweeping bridge */}
            <Path d="M 280,280 L 374,270 L 774,700 L 680,754 Z" fill="url(#diagBridge)" />

            {/* Right upright */}
            <Rect x="650" y="270" width="124" height="484" rx="44" fill="url(#rightBar)" />
            <Rect x="656" y="276" width="36" height="230" rx="18" fill="url(#sheen)" />

            {/* 3D terminal nodes */}
            <Circle cx="312" cy="332" r="62" fill="url(#leftBar)" />
            <Circle cx="712" cy="692" r="62" fill="url(#rightBar)" />

            {/* Ambient spark */}
            <G transform="translate(760, 240)">
              <Path d="M 0,-24 Q 0,0 24,0 Q 0,0 0,24 Q 0,0 -24,0 Q 0,0 0,-24 Z" fill="#38BDF8" />
              <Circle cx="0" cy="0" r="6" fill="#FFFFFF" />
            </G>
          </G>
        </Svg>
      </View>

      {/* Typography if requested */}
      {showText && (
        <View style={styles.textWrap}>
          <Text style={[styles.title, isDark ? styles.titleDark : styles.titleLight]}>
            NUVORA
          </Text>
          {subtitle ? (
            <Text style={[styles.subtitle, isDark ? styles.subDark : styles.subLight]}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    alignItems: 'center',
    marginTop: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 4,
  },
  titleDark: {
    color: '#FFFFFF',
  },
  titleLight: {
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.2,
    marginTop: 3,
    textTransform: 'uppercase',
  },
  subDark: {
    color: '#94A3B8',
  },
  subLight: {
    color: '#64748B',
  },
});
