import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { THEME } from '../src/theme/tokens';

type PolicyType = 'terms' | 'privacy' | 'refund' | 'ai';

export default function PolicyScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ type?: string }>();
  const [activeTab, setActiveTab] = useState<PolicyType>((params.type as PolicyType) || 'terms');

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Legal & Policies</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabList}
      >
        <TouchableOpacity
          style={[styles.tabChip, activeTab === 'terms' && styles.tabChipActive]}
          onPress={() => setActiveTab('terms')}
        >
          <Text style={[styles.tabText, activeTab === 'terms' && styles.tabTextActive]}>Terms & Conditions</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabChip, activeTab === 'privacy' && styles.tabChipActive]}
          onPress={() => setActiveTab('privacy')}
        >
          <Text style={[styles.tabText, activeTab === 'privacy' && styles.tabTextActive]}>Privacy Policy</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabChip, activeTab === 'refund' && styles.tabChipActive]}
          onPress={() => setActiveTab('refund')}
        >
          <Text style={[styles.tabText, activeTab === 'refund' && styles.tabTextActive]}>Refund Policy</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabChip, activeTab === 'ai' && styles.tabChipActive]}
          onPress={() => setActiveTab('ai')}
        >
          <Text style={[styles.tabText, activeTab === 'ai' && styles.tabTextActive]}>AI Processing Disclosure</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Body Content */}
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'terms' && (
          <View style={styles.clauseGroup}>
            <Text style={styles.clauseTitle}>Terms of Service</Text>
            <Text style={styles.effectiveDate}>Last updated: November 14, 2026</Text>

            <Text style={styles.heading}>1. Acceptance of Terms</Text>
            <Text style={styles.paragraph}>
              By accessing or using NIMO (the "App"), developed by HOUSEOFTECH INNOVATION PRIVATE LIMITED, you agree to be bound by these Terms of Service. If you do not agree, do not use the application.
            </Text>

            <Text style={styles.heading}>2. Coin Economy & Entitlements</Text>
            <Text style={styles.paragraph}>
              Coins are non-transferable internal digital entitlements used exclusively to trigger generative AI templates. Purchased coins do not expire, subject to active account status. Coins have no real-world cash equivalence and cannot be redeemed for fiat currency.
            </Text>

            <Text style={styles.heading}>3. User Conduct & Content Guidelines</Text>
            <Text style={styles.paragraph}>
              You must only upload photographs of yourself or persons from whom you have obtained explicit verifiable consent. You must not upload or generate unlawful, sexually explicit, abusive, or copyright-infringing imagery.
            </Text>
          </View>
        )}

        {activeTab === 'privacy' && (
          <View style={styles.clauseGroup}>
            <Text style={styles.clauseTitle}>Privacy Policy</Text>
            <Text style={styles.effectiveDate}>Last updated: November 14, 2026</Text>

            <Text style={styles.heading}>1. Information We Collect</Text>
            <Text style={styles.paragraph}>
              We collect your phone number and full name for account verification and billing. We temporarily store uploaded source photographs solely for processing through our server-side generative AI provider.
            </Text>

            <Text style={styles.heading}>2. No Biometric Selling</Text>
            <Text style={styles.paragraph}>
              NIMO does not sell, trade, or exploit your facial likeness or biometric data. Source photographs are retained in encrypted, private cloud buckets and deleted according to published retention rules.
            </Text>

            <Text style={styles.heading}>3. DPDPA Compliance & User Rights</Text>
            <Text style={styles.paragraph}>
              Under the Digital Personal Data Protection Act (DPDPA), Indian users have the right to access, rectify, and permanently purge all stored photographs and personal data via the in-app Delete Account workflow.
            </Text>
          </View>
        )}

        {activeTab === 'refund' && (
          <View style={styles.clauseGroup}>
            <Text style={styles.clauseTitle}>Refund & Cancellation Policy</Text>
            <Text style={styles.effectiveDate}>Last updated: November 14, 2026</Text>

            <Text style={styles.heading}>1. Automatic Failed Generation Refunds</Text>
            <Text style={styles.paragraph}>
              If an AI portrait job fails due to an upstream provider error, timeout, or server error, all reserved coins are automatically credited back to your wallet instantly and completely.
            </Text>

            <Text style={styles.heading}>2. Coin Package Purchases</Text>
            <Text style={styles.paragraph}>
              Due to the immediate delivery of digital goods, coin package recharges processed through Apple In-App Purchase and Google Play Billing are final and non-refundable once coins have been credited.
            </Text>
          </View>
        )}

        {activeTab === 'ai' && (
          <View style={styles.clauseGroup}>
            <Text style={styles.clauseTitle}>AI Biometric & Content Disclosure</Text>
            <Text style={styles.effectiveDate}>Last updated: November 14, 2026</Text>

            <Text style={styles.heading}>1. AI Provider Architecture</Text>
            <Text style={styles.paragraph}>
              Portraits in NIMO are generated using third-party artificial intelligence foundation models (including xAI Grok Imagine Image 2.0).
            </Text>

            <Text style={styles.heading}>2. Facial Identity & Artifacts</Text>
            <Text style={styles.paragraph}>
              Generative AI outputs are artistic interpretations. While NIMO uses advanced identity-preservation prompting, slight variances in lighting, facial structure, skin tone, or hair texture may occur.
            </Text>
          </View>
        )}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  tabList: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  tabChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: THEME.radii.pill,
    backgroundColor: THEME.colors.bgCard,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  tabChipActive: {
    backgroundColor: THEME.colors.accentElectric,
    borderColor: THEME.colors.accentViolet,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
  tabTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 40,
  },
  clauseGroup: {
    gap: 12,
  },
  clauseTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
  },
  effectiveDate: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginBottom: 8,
  },
  heading: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    marginTop: 10,
  },
  paragraph: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    lineHeight: 20,
  },
});
