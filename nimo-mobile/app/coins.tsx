import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { THEME } from '../src/theme/tokens';
import { useAppStore } from '../src/store/useAppStore';

export default function CreditWalletScreen() {
  const router = useRouter();
  const { coinsAvailable, transactions } = useAppStore();
  const [selectedPack, setSelectedPack] = useState<'100' | '500' | '1000'>('500');

  const packages = [
    { id: '100', credits: 100, price: '$2.99', badge: null },
    { id: '500', credits: 500, price: '$9.99', badge: 'Most Popular' },
    { id: '1000', credits: 1000, price: '$14.99', badge: null },
  ];

  const handleBuyCredits = () => {
    const pack = packages.find((p) => p.id === selectedPack);
    Alert.alert(
      'Purchase Confirmation',
      `Add ${pack?.credits} Credits for ${pack?.price}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            Alert.alert('Success 🎉', `Successfully added ${pack?.credits} credits to your wallet!`);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Credit Wallet</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Balance Card with Gold Coin, 245 Credits, Buy Credits button */}
        <View style={styles.balanceCard}>
          <View style={styles.coinIconCircle}>
            <Text style={styles.coinDollar}>$</Text>
          </View>

          <View style={styles.balanceInfo}>
            <Text style={styles.balanceAmount}>{coinsAvailable}</Text>
            <Text style={styles.balanceLabel}>Credits</Text>
          </View>

          <TouchableOpacity style={styles.buyBtn} onPress={handleBuyCredits} activeOpacity={0.88}>
            <Text style={styles.buyBtnText}>Buy Credits</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Purchase Section */}
        <Text style={styles.sectionTitle}>Quick Purchase</Text>

        <View style={styles.packsList}>
          {packages.map((pkg) => {
            const isSelected = selectedPack === pkg.id;
            return (
              <TouchableOpacity
                key={pkg.id}
                style={[styles.packCard, isSelected && styles.packCardSelected]}
                onPress={() => setSelectedPack(pkg.id as any)}
                activeOpacity={0.88}
              >
                {pkg.badge && (
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularBadgeText}>{pkg.badge}</Text>
                  </View>
                )}

                <View style={styles.packLeft}>
                  <View style={styles.smallCoinCircle}>
                    <Text style={styles.smallCoinDollar}>$</Text>
                  </View>
                  <View>
                    <Text style={styles.packCreditsText}>{pkg.credits} Credits</Text>
                    <Text style={styles.packPriceText}>{pkg.price}</Text>
                  </View>
                </View>

                {/* Radio Circle */}
                <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                  {isSelected && <View style={styles.radioInnerDot} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Recent Transactions Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          <TouchableOpacity>
            <Text style={styles.viewAllText}>View All →</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.txList}>
          {transactions.map((tx) => {
            const isCredit = tx.amount > 0;
            return (
              <View key={tx.id} style={styles.txRow}>
                <View style={styles.txLeft}>
                  <View style={[styles.txIconCircle, { backgroundColor: isCredit ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)' }]}>
                    <Text style={[styles.txCoinText, { color: isCredit ? '#10B981' : '#F59E0B' }]}>$</Text>
                  </View>
                  <View>
                    <Text style={styles.txTitle}>{tx.title}</Text>
                    <Text style={styles.txDate}>{tx.date}</Text>
                  </View>
                </View>
                <Text style={[styles.txAmount, { color: isCredit ? '#10B981' : '#EF4444' }]}>
                  {isCredit ? `+${tx.amount}` : `${tx.amount}`}
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.colors.bgPrimary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: 48,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  iconBtn: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },
  balanceCard: {
    backgroundColor: '#1E103E',
    borderRadius: THEME.radii.xl,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(139, 92, 246, 0.4)',
    marginBottom: 24,
  },
  coinIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FDE68A',
    marginBottom: 10,
  },
  coinDollar: {
    color: '#78350F',
    fontSize: 26,
    fontWeight: '900',
  },
  balanceInfo: {
    alignItems: 'center',
    marginBottom: 16,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFF',
  },
  balanceLabel: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  buyBtn: {
    width: '100%',
    height: 48,
    backgroundColor: THEME.colors.accentViolet,
    borderRadius: THEME.radii.pill,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: THEME.colors.accentViolet,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  buyBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    marginBottom: 14,
  },
  packsList: {
    gap: 12,
    marginBottom: 26,
  },
  packCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: THEME.colors.bgCard,
    borderRadius: THEME.radii.lg,
    padding: 16,
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
    position: 'relative',
  },
  packCardSelected: {
    borderColor: THEME.colors.accentViolet,
    backgroundColor: '#1E103E',
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    right: 18,
    backgroundColor: '#EC4899',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  popularBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
  },
  packLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  smallCoinCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  smallCoinDollar: {
    color: '#78350F',
    fontSize: 16,
    fontWeight: '900',
  },
  packCreditsText: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  packPriceText: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: THEME.colors.textMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleSelected: {
    borderColor: THEME.colors.accentViolet,
  },
  radioInnerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: THEME.colors.accentViolet,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  viewAllText: {
    fontSize: 13,
    color: THEME.colors.accentViolet,
    fontWeight: '700',
  },
  txList: {
    backgroundColor: THEME.colors.bgCard,
    borderRadius: THEME.radii.lg,
    padding: 14,
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
    gap: 14,
  },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  txLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  txIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  txCoinText: {
    fontSize: 14,
    fontWeight: '900',
  },
  txTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  txDate: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  txAmount: {
    fontSize: 15,
    fontWeight: '800',
  },
});
