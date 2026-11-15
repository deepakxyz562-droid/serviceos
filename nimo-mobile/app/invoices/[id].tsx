import React from 'react';
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { THEME } from '../../src/theme/tokens';

export default function InvoiceDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id?: string;
    invoiceNumber?: string;
    date?: string;
    title?: string;
    amount?: string;
    taxable?: string;
    cgst?: string;
    sgst?: string;
    paymentRef?: string;
  }>();

  const handleDownloadPdf = () => {
    Alert.alert('Download Receipt', `Invoice ${params.invoiceNumber || 'INV-NIMO'} downloaded to your device as PDF.`);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tax Invoice</Text>
        <TouchableOpacity style={styles.shareBtn} onPress={handleDownloadPdf}>
          <Ionicons name="download-outline" size={20} color={THEME.colors.accentViolet} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Invoice Card Container */}
        <View style={styles.paperCard}>
          {/* Top Brand & Seller Info */}
          <View style={styles.sellerSection}>
            <View style={styles.brandRow}>
              <View style={styles.logoBadge}>
                <Ionicons name="aperture" size={18} color={THEME.colors.accentViolet} />
                <Text style={styles.brandName}>NIMO AI STUDIO</Text>
              </View>
              <Text style={styles.originalBadge}>ORIGINAL RECEIPT</Text>
            </View>

            <Text style={styles.sellerText}>HOUSEOFTECH INNOVATION PRIVATE LIMITED</Text>
            <Text style={styles.sellerSub}>GSTIN: 07AAACH1234F1Z8</Text>
            <Text style={styles.sellerSub}>Gurugram, Haryana, India - 122002</Text>
          </View>

          <View style={styles.divider} />

          {/* Invoice Meta */}
          <View style={styles.metaRow}>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>Invoice No</Text>
              <Text style={styles.metaValue}>{params.invoiceNumber || 'INV-2026-NIMO-1042'}</Text>
            </View>
            <View style={styles.metaColRight}>
              <Text style={styles.metaLabel}>Date</Text>
              <Text style={styles.metaValue}>{params.date || '14 Nov 2026'}</Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>Payment Reference</Text>
              <Text style={styles.metaValue}>{params.paymentRef || 'pay_NIMO99281734'}</Text>
            </View>
            <View style={styles.metaColRight}>
              <Text style={styles.metaLabel}>Status</Text>
              <Text style={[styles.metaValue, { color: THEME.colors.success }]}>PAID</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Item Table */}
          <Text style={styles.sectionHeader}>PURCHASE DETAILS</Text>
          <View style={styles.tableRow}>
            <Text style={styles.itemTitle}>{params.title || 'Creator Pack (250 + 50 Coins)'}</Text>
            <Text style={styles.itemPrice}>{params.taxable || '₹168.64'}</Text>
          </View>

          <View style={styles.divider} />

          {/* Indian GST Tax Breakdown */}
          <View style={styles.taxSection}>
            <View style={styles.taxRow}>
              <Text style={styles.taxLabel}>Taxable Value</Text>
              <Text style={styles.taxVal}>{params.taxable || '₹168.64'}</Text>
            </View>
            <View style={styles.taxRow}>
              <Text style={styles.taxLabel}>Central GST (CGST @ 9%)</Text>
              <Text style={styles.taxVal}>{params.cgst || '₹15.18'}</Text>
            </View>
            <View style={styles.taxRow}>
              <Text style={styles.taxLabel}>State GST (SGST @ 9%)</Text>
              <Text style={styles.taxVal}>{params.sgst || '₹15.18'}</Text>
            </View>

            <View style={[styles.divider, { marginVertical: 8 }]} />

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Amount (INR)</Text>
              <Text style={styles.totalValue}>{params.amount || '₹199.00'}</Text>
            </View>
          </View>
        </View>

        {/* Download PDF CTA */}
        <TouchableOpacity style={styles.downloadBtn} onPress={handleDownloadPdf}>
          <Ionicons name="download-outline" size={18} color="#FFF" />
          <Text style={styles.downloadBtnText}>Download PDF Invoice</Text>
        </TouchableOpacity>
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
  shareBtn: {
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
  content: {
    padding: 16,
    gap: 16,
  },
  paperCard: {
    backgroundColor: THEME.colors.bgCard,
    borderRadius: THEME.radii.xl,
    padding: 20,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    gap: 12,
  },
  sellerSection: {
    gap: 4,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  logoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandName: {
    fontSize: 15,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
    letterSpacing: 1,
  },
  originalBadge: {
    fontSize: 10,
    color: THEME.colors.accentViolet,
    fontWeight: '700',
    backgroundColor: 'rgba(168, 85, 247, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sellerText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  sellerSub: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  divider: {
    height: 1,
    backgroundColor: THEME.colors.border,
    marginVertical: 4,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaCol: {
    gap: 2,
  },
  metaColRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  metaLabel: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.textMuted,
    letterSpacing: 1,
    marginTop: 4,
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  taxSection: {
    gap: 6,
  },
  taxRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  taxLabel: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
  },
  taxVal: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '900',
    color: THEME.colors.coinGold,
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.accentElectric,
    paddingVertical: 15,
    borderRadius: THEME.radii.lg,
    gap: 8,
  },
  downloadBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
