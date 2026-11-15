import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { THEME } from '../../src/theme/tokens';

const SAMPLE_INVOICES = [
  {
    id: 'inv_01',
    invoiceNumber: 'INV-2026-NIMO-1042',
    date: '14 Nov 2026',
    title: 'Creator Pack (250 + 50 Coins)',
    amount: '₹199.00',
    status: 'Paid',
    taxable: '₹168.64',
    cgst: '₹15.18',
    sgst: '₹15.18',
    paymentRef: 'pay_NIMO99281734',
  },
  {
    id: 'inv_02',
    invoiceNumber: 'INV-2026-NIMO-0831',
    date: '02 Nov 2026',
    title: 'Starter Pack (100 Coins)',
    amount: '₹99.00',
    status: 'Paid',
    taxable: '₹83.90',
    cgst: '₹7.55',
    sgst: '₹7.55',
    paymentRef: 'pay_NIMO84729110',
  },
];

export default function InvoicesScreen() {
  const router = useRouter();
  const [invoices] = useState(SAMPLE_INVOICES);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Invoices & Receipts</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={invoices}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.invoiceCard}
            activeOpacity={0.8}
            onPress={() =>
              router.push({
                pathname: '/invoices/[id]',
                params: {
                  id: item.id,
                  invoiceNumber: item.invoiceNumber,
                  date: item.date,
                  title: item.title,
                  amount: item.amount,
                  taxable: item.taxable,
                  cgst: item.cgst,
                  sgst: item.sgst,
                  paymentRef: item.paymentRef,
                },
              })
            }
          >
            <View style={styles.invoiceHeader}>
              <View style={styles.invoiceIconBox}>
                <Ionicons name="receipt-outline" size={22} color={THEME.colors.accentViolet} />
              </View>
              <View style={styles.invoiceMeta}>
                <Text style={styles.invoiceNum}>{item.invoiceNumber}</Text>
                <Text style={styles.invoiceDate}>{item.date} • {item.title}</Text>
              </View>
            </View>

            <View style={styles.invoiceRight}>
              <Text style={styles.invoiceAmount}>{item.amount}</Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>{item.status}</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={48} color={THEME.colors.textMuted} />
            <Text style={styles.emptyTitle}>No invoices yet</Text>
            <Text style={styles.emptySubtitle}>
              Invoices will appear here automatically after any coin recharge.
            </Text>
          </View>
        }
      />
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
  listContent: {
    padding: 16,
    gap: 12,
  },
  invoiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.colors.bgCard,
    borderRadius: THEME.radii.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  invoiceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  invoiceIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: THEME.colors.bgSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  invoiceMeta: {
    gap: 4,
    flex: 1,
  },
  invoiceNum: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  invoiceDate: {
    fontSize: 12,
    color: THEME.colors.textMuted,
  },
  invoiceRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  invoiceAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  statusBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: THEME.radii.pill,
  },
  statusText: {
    color: THEME.colors.success,
    fontSize: 11,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  emptySubtitle: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
