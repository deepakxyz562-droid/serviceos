import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { THEME } from '../src/theme/tokens';
import { useAppStore } from '../src/store/useAppStore';

export default function LimitedOfferModal() {
  const router = useRouter();
  const { fetchBalance } = useAppStore();
  const [secondsLeft, setSecondsLeft] = useState(359); // ~6 minutes remaining

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleClaim = () => {
    Alert.alert(
      'Special Offer Claimed! 🎉',
      '400 Coins credited to your NIMO wallet.',
      [
        {
          text: 'Awesome',
          onPress: () => {
            fetchBalance();
            router.back();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.modalCard}>
        {/* Close Button */}
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={22} color="#FFF" />
        </TouchableOpacity>

        {/* Artwork icon */}
        <View style={styles.badgeRow}>
          <View style={styles.fireBadge}>
            <Ionicons name="flame" size={14} color="#FFF" />
            <Text style={styles.fireBadgeText}>FLASH DEAL • 60% OFF</Text>
          </View>
        </View>

        <Text style={styles.headline}>One-Time Creator Special</Text>
        <Text style={styles.subtitle}>
          Get 400 Coins to create 80+ professional portraits for less than the price of a coffee.
        </Text>

        {/* Countdown Box */}
        <View style={styles.timerBox}>
          <Text style={styles.timerLabel}>Offer expires in</Text>
          <Text style={styles.timerValue}>{formatTime(secondsLeft)}</Text>
        </View>

        {/* Pricing Comparison */}
        <View style={styles.priceBox}>
          <Text style={styles.oldPrice}>₹399</Text>
          <Text style={styles.newPrice}>₹149</Text>
          <Text style={styles.coinsAmount}>🪙 400 Coins</Text>
        </View>

        {/* Action Button */}
        <TouchableOpacity style={styles.claimBtn} onPress={handleClaim} activeOpacity={0.88}>
          <Text style={styles.claimBtnText}>Claim Offer for ₹149</Text>
          <Ionicons name="flash" size={16} color="#FFF" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.dismissBtn} onPress={() => router.back()}>
          <Text style={styles.dismissText}>No thanks, I'll pay full price later</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'rgba(5, 1, 20, 0.92)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: THEME.colors.bgCard,
    borderRadius: THEME.radii.xl,
    padding: 24,
    borderWidth: 1.5,
    borderColor: THEME.colors.accentViolet,
    alignItems: 'center',
    position: 'relative',
    gap: 12,
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME.colors.bgSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  badgeRow: {
    marginBottom: 4,
  },
  fireBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF3B30',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: THEME.radii.pill,
    gap: 4,
  },
  fireBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  headline: {
    fontSize: 22,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  timerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.bgSecondary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: THEME.radii.pill,
    gap: 8,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  timerLabel: {
    fontSize: 12,
    color: THEME.colors.textMuted,
  },
  timerValue: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.coinGold,
  },
  priceBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
    marginVertical: 6,
  },
  oldPrice: {
    fontSize: 16,
    color: THEME.colors.textMuted,
    textDecorationLine: 'line-through',
    fontWeight: '700',
  },
  newPrice: {
    fontSize: 32,
    fontWeight: '900',
    color: THEME.colors.coinGold,
  },
  coinsAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  claimBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.accentElectric,
    width: '100%',
    paddingVertical: 15,
    borderRadius: THEME.radii.lg,
    gap: 8,
    marginTop: 6,
  },
  claimBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
  },
  dismissBtn: {
    paddingVertical: 8,
  },
  dismissText: {
    color: THEME.colors.textMuted,
    fontSize: 12,
  },
});
