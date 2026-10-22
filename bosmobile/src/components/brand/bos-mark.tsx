import React from 'react';
import { View, Text, StyleSheet, Image, StyleProp, ViewStyle } from 'react-native';

interface BosMarkProps {
  size?: number;
  showText?: boolean;
  subtitle?: string;
  variant?: 'dark' | 'light';
  style?: StyleProp<ViewStyle>;
}

export function BosMark({
  size = 56,
  showText = false,
  subtitle = 'Business Operating System',
  variant = 'dark',
  style,
}: BosMarkProps) {
  const isDark = variant === 'dark';

  return (
    <View style={[styles.container, style]}>
      <View
        style={[
          styles.logoContainer,
          {
            width: size,
            height: size,
            borderRadius: Math.round(size * 0.22),
          },
        ]}
      >
        <Image
          source={require('../../../assets/logo-mark.png')}
          style={{
            width: size,
            height: size,
            borderRadius: Math.round(size * 0.22),
          }}
          resizeMode="contain"
        />
      </View>

      {showText && (
        <View style={styles.textContainer}>
          <Text
            style={[
              styles.brandName,
              { color: isDark ? '#FFFFFF' : '#0B1F17' },
            ]}
          >
            BOS
          </Text>
          {subtitle ? (
            <Text
              style={[
                styles.subtitle,
                { color: isDark ? '#34D399' : '#059669' },
              ]}
            >
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
  logoContainer: {
    overflow: 'hidden',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  textContainer: {
    alignItems: 'center',
    marginTop: 12,
  },
  brandName: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginTop: 3,
  },
});
