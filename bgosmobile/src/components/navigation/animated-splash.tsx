import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const squircleIcon = require('../../../assets/icon-squircle.png');

interface AnimatedSplashProps {
  ready: boolean;
}

/**
 * Light mint-white animated launch splash matching the BGOS mobile design kit.
 * Holds smoothly until fonts + session check settle (with a hard timeout cap),
 * then fades and scales out seamlessly over the active screen.
 */
export function AnimatedSplash({ ready }: AnimatedSplashProps) {
  const [dismissed, setDismissed] = useState(false);
  const [minHoldDone, setMinHoldDone] = useState(false);

  const containerOpacity = useRef(new Animated.Value(1)).current;
  const containerScale = useRef(new Animated.Value(1)).current;
  const logoScale = useRef(new Animated.Value(0.84)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(10)).current;
  const pulseScale = useRef(new Animated.Value(0.92)).current;
  const pulseOpacity = useRef(new Animated.Value(0.22)).current;
  const exitStarted = useRef(false);

  // Entry choreography + minimum brand hold timer
  useEffect(() => {
    let mounted = true;
    let pulseLoop: Animated.CompositeAnimation | null = null;

    const holdTimer = setTimeout(() => {
      if (mounted) setMinHoldDone(true);
    }, 950);

    // Safety fail-safe so launch screen can never stall even if offline/slow
    const maxTimer = setTimeout(() => {
      if (mounted) setMinHoldDone(true);
    }, 2500);

    void AccessibilityInfo.isReduceMotionEnabled()
      .then((reduced) => {
        if (!mounted) return;
        if (reduced) {
          logoScale.setValue(1);
          logoOpacity.setValue(1);
          textOpacity.setValue(1);
          textTranslateY.setValue(0);
          return;
        }

        Animated.parallel([
          Animated.spring(logoScale, {
            toValue: 1,
            tension: 65,
            friction: 7,
            useNativeDriver: true,
          }),
          Animated.timing(logoOpacity, {
            toValue: 1,
            duration: 420,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start();

        Animated.parallel([
          Animated.timing(textOpacity, {
            toValue: 1,
            duration: 420,
            delay: 140,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(textTranslateY, {
            toValue: 0,
            duration: 420,
            delay: 140,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start();

        pulseLoop = Animated.loop(
          Animated.sequence([
            Animated.parallel([
              Animated.timing(pulseScale, {
                toValue: 1.18,
                duration: 1100,
                easing: Easing.out(Easing.sin),
                useNativeDriver: true,
              }),
              Animated.timing(pulseOpacity, {
                toValue: 0.06,
                duration: 1100,
                easing: Easing.out(Easing.sin),
                useNativeDriver: true,
              }),
            ]),
            Animated.parallel([
              Animated.timing(pulseScale, {
                toValue: 0.94,
                duration: 900,
                easing: Easing.inOut(Easing.sin),
                useNativeDriver: true,
              }),
              Animated.timing(pulseOpacity, {
                toValue: 0.22,
                duration: 900,
                easing: Easing.inOut(Easing.sin),
                useNativeDriver: true,
              }),
            ]),
          ]),
        );
        pulseLoop.start();
      })
      .catch(() => {
        logoScale.setValue(1);
        logoOpacity.setValue(1);
        textOpacity.setValue(1);
        textTranslateY.setValue(0);
      });

    return () => {
      mounted = false;
      clearTimeout(holdTimer);
      clearTimeout(maxTimer);
      pulseLoop?.stop();
    };
  }, [logoOpacity, logoScale, pulseOpacity, pulseScale, textOpacity, textTranslateY]);

  // Exit fade-out once both minHoldDone & ready are met
  useEffect(() => {
    if (!ready || !minHoldDone || exitStarted.current) return;
    exitStarted.current = true;

    Animated.parallel([
      Animated.timing(containerOpacity, {
        toValue: 0,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(containerScale, {
        toValue: 1.03,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) setDismissed(true);
      else setDismissed(true);
    });
  }, [ready, minHoldDone, containerOpacity, containerScale]);

  if (dismissed) return null;

  return (
    <Animated.View
      pointerEvents="auto"
      accessibilityElementsHidden={false}
      style={[
        styles.overlay,
        {
          opacity: containerOpacity,
          transform: [{ scale: containerScale }],
        },
      ]}
    >
      {/* Subtle mint radial accent bands */}
      <View style={styles.topGlow} />
      <View style={styles.bottomGlow} />

      <View style={styles.centerBlock}>
        <View style={styles.haloWrap}>
          <Animated.View
            style={[
              styles.haloRing,
              {
                opacity: pulseOpacity,
                transform: [{ scale: pulseScale }],
              },
            ]}
          />
          <Animated.View
            style={{
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            }}
          >
            <Image
              source={squircleIcon}
              style={styles.squircle}
              accessibilityIgnoresInvertColors
              alt="BGOS logo"
            />
          </Animated.View>
        </View>

        <Animated.View
          style={{
            alignItems: 'center',
            opacity: textOpacity,
            transform: [{ translateY: textTranslateY }],
          }}
        >
          <Text style={styles.wordmark}>bgos</Text>
          <Text style={styles.tagline}>Your business. Automated.</Text>
        </Animated.View>
      </View>

      <Animated.View style={[styles.footer, { opacity: textOpacity }]}>
        <Text style={styles.footerText}>Business Growth OS</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    backgroundColor: '#F5FBF8',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  topGlow: {
    position: 'absolute',
    top: -120,
    right: -80,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(11, 144, 66, 0.06)',
  },
  bottomGlow: {
    position: 'absolute',
    bottom: -140,
    left: -90,
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: 'rgba(52, 211, 153, 0.08)',
  },
  centerBlock: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  haloWrap: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  haloRing: {
    position: 'absolute',
    width: 126,
    height: 126,
    borderRadius: 40,
    backgroundColor: '#0B9042',
  },
  squircle: {
    width: 96,
    height: 96,
    resizeMode: 'contain',
  },
  wordmark: {
    fontSize: 40,
    fontWeight: '800',
    color: '#0B9042',
    letterSpacing: -1.3,
    lineHeight: 46,
  },
  tagline: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#4B6379',
    marginTop: 4,
    letterSpacing: -0.1,
  },
  footer: {
    position: 'absolute',
    bottom: 42,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0B9042',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    opacity: 0.75,
  },
});
