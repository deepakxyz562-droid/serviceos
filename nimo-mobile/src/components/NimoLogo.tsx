import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { THEME } from '../theme/tokens';

interface NimoLogoProps {
  size?: 'small' | 'medium' | 'large' | 'hero';
  showText?: boolean;
  showTagline?: boolean;
  alignCenter?: boolean;
}

export function NimoLogo({
  size = 'medium',
  showText = true,
  showTagline = false,
  alignCenter = false,
}: NimoLogoProps) {
  const getDimensions = () => {
    switch (size) {
      case 'small':
        return { iconSize: 26, fontSize: 16, nSize: 18, radius: 8 };
      case 'large':
        return { iconSize: 52, fontSize: 24, nSize: 34, radius: 14 };
      case 'hero':
        return { iconSize: 76, fontSize: 32, nSize: 52, radius: 20 };
      case 'medium':
      default:
        return { iconSize: 38, fontSize: 20, nSize: 24, radius: 10 };
    }
  };

  const { iconSize, fontSize, nSize, radius } = getDimensions();

  return (
    <View style={[styles.container, alignCenter && styles.centerAlign]}>
      <View style={styles.brandRow}>
        {/* Luminous Curved N Emblem */}
        <View
          style={[
            styles.iconWrapper,
            {
              width: iconSize,
              height: iconSize,
              borderRadius: radius,
            },
          ]}
        >
          <View style={styles.glowOverlay} />
          <Text style={[styles.nGlyph, { fontSize: nSize, lineHeight: nSize * 1.1 }]}>
            N
          </Text>
        </View>

        {showText && (
          <Text style={[styles.brandText, { fontSize }]}>
            NIMO
          </Text>
        )}
      </View>

      {showTagline && (
        <Text style={styles.tagline}>
          Create. Transform. Shine.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
  },
  centerAlign: {
    alignItems: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconWrapper: {
    backgroundColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 1.5,
    borderColor: '#C084FC',
  },
  glowOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(236, 72, 153, 0.35)',
    transform: [{ rotate: '45deg' }, { scale: 1.4 }],
  },
  nGlyph: {
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    fontFamily: 'System',
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
  },
  brandText: {
    color: THEME.colors.textPrimary,
    fontWeight: '900',
    letterSpacing: 1.5,
    fontFamily: 'System',
  },
  tagline: {
    color: THEME.colors.textSecondary,
    fontSize: 13,
    marginTop: 4,
    letterSpacing: 0.5,
    fontWeight: '500',
  },
});
