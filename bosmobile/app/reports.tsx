import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
  Linking,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { apiRequest } from '@/lib/api';
import { useBlueprintStore } from '@/stores/blueprint-store';

type Period = 'today' | 'yesterday' | 'this_week' | 'this_month' | 'this_fy';
type ReportTab = 'sales' | 'items' | 'gst' | 'daybook' | 'dues';

export default function MobileReportsScreen() {
  const { blueprint, countryPack } = useBlueprintStore();
  const language = blueprint.language === 'hi' ? 'hi' : 'en';
  const t = (en: string, hi: string) => (language === 'hi' ? hi : en);
  const currencySymbol = countryPack?.currency?.symbol || '₹';



  const [period, setPeriod] = useState<Period>('today');
  const [tab, setTab] = useState<ReportTab>('sales');
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [data, setData] = useState<any>(null);

  const fetchReports = useCallback(async (p: Period) => {
    try {
      setLoading(true);
      setHasError(false);
      const res = await apiRequest<any>(`/api/commerce/reports?period=${p}`);
      setData(res);
    } catch {
      // Offline fallback: zeroed data with error state banner
      setHasError(true);
      setData({
        summary: {
          totalRevenue: 0,
          grossProfit: 0,
          totalExpenses: 0,
          netProfit: 0,
          marginPct: 0,
          totalOrders: 0,
          avgOrderValue: 0,
          gstCollected: 0,
          itcClaimable: 0,
        },
        salesByMethod: [],
        topProducts: [],
        gstSummary: {
          taxableSales: 0,
          totalGstCollected: 0,
          cgst: 0,
          sgst: 0,
          rateBuckets: [],
        },
        daybookSummary: {
          openingBalance: 0,
          moneyIn: 0,
          moneyOut: 0,
          closingBalance: 0,
        },
        khataSummary: {
          totalReceivables: 0,
          totalPayables: 0,
          aging: {
            current: 0,
            dueSoon: 0,
            overdue: 0,
          },
        },
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void fetchReports(period);
    }, [period, fetchReports])
  );

  const handleShareReport = async () => {
    if (!data?.summary) return;
    const storeName = blueprint.businessName || 'BOS Store';
    const periodName =
      period === 'today'
        ? t('Today', 'आज')
        : period === 'yesterday'
        ? t('Yesterday', 'कल')
        : period === 'this_week'
        ? t('This Week', 'इस हफ़्ते')
        : period === 'this_month'
        ? t('This Month', 'इस महीने')
        : t('This Year', 'इस साल');

    const msg =
      `📊 *${storeName} - ${t('Sales & Business Report', 'बिक्री व व्यापार रिपोर्ट')}*\n` +
      `📅 *${t('Period', 'अवधि')}:* ${periodName}\n` +
      `---------------------------\n` +
      `💰 *${t('Total Sales', 'कुल बिक्री')}:* ${currencySymbol}${data.summary.totalRevenue.toLocaleString('en-IN')}\n` +
      `📦 *${t('Total Bills', 'कुल बिल')}:* ${data.summary.totalOrders}\n` +
      `📈 *${t('Net Profit', 'शुद्ध मुनाफ़ा')}:* ${currencySymbol}${data.summary.netProfit.toLocaleString('en-IN')} (${data.summary.marginPct}%)\n` +
      `🏦 *${t('Cash in Drawer', 'कैश बैलेंस')}:* ${currencySymbol}${data.daybookSummary?.closingBalance?.toLocaleString('en-IN') || 0}\n` +
      `📋 *${t('GST Tax Collected', 'जीएसटी टैक्स')}:* ${currencySymbol}${data.summary.gstCollected.toLocaleString('en-IN')}\n` +
      `👥 *${t('Customer Udhaar Dues', 'ग्राहक उधार बाकी')}:* ${currencySymbol}${data.khataSummary?.totalReceivables?.toLocaleString('en-IN') || 0}\n` +
      `---------------------------\n` +
      `Generated via BOS Billing & Business App`;

    try {
      await Share.share({ message: msg });
    } catch {
      Alert.alert(t('Unable to share report', 'रिपोर्ट शेयर नहीं हो सकी'));
    }
  };

  const s = data?.summary || {
    totalRevenue: 0,
    grossProfit: 0,
    totalExpenses: 0,
    netProfit: 0,
    marginPct: 0,
    totalOrders: 0,
    gstCollected: 0,
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => router.back()}
          style={styles.backBtn}
        >
          <MaterialIcons name="arrow-back" size={24} color="#142d25" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>
            {t('Reports & Analytics', 'व्यापार रिपोर्ट')}
          </Text>
          <Text style={styles.headerSub}>
            {t('Sales, Tax, P&L and Khata summaries', 'बिक्री, टैक्स और मुनाफ़ा')}
          </Text>
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={handleShareReport}
          style={styles.shareBtn}
        >
          <MaterialIcons name="share" size={20} color="#0A6847" />
        </TouchableOpacity>
      </View>

      {/* Period Chips */}
      <View style={styles.periodRow}>
        {(
          [
            { id: 'today', en: 'Today', hi: 'आज' },
            { id: 'yesterday', en: 'Yesterday', hi: 'कल' },
            { id: 'this_week', en: 'This Week', hi: 'हफ़्ता' },
            { id: 'this_month', en: 'This Month', hi: 'महीना' },
            { id: 'this_fy', en: 'Year (FY)', hi: 'साल' },
          ] as const
        ).map((p) => {
          const active = period === p.id;
          return (
            <TouchableOpacity
              key={p.id}
              accessibilityRole="button"
              onPress={() => setPeriod(p.id)}
              style={[styles.periodChip, active && styles.periodChipActive]}
            >
              <Text
                style={[
                  styles.periodChipText,
                  active && styles.periodChipTextActive,
                ]}
              >
                {t(p.en, p.hi)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#0A6847" />
          <Text style={styles.loadingText}>
            {t('Calculating business reports...', 'रिपोर्ट तैयार हो रही है...')}
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {hasError && (
            <View style={styles.errorBanner}>
              <MaterialIcons name="cloud-off" size={18} color="#991B1B" />
              <Text style={styles.errorBannerText}>
                {t('Network or server error. Showing zeroed values.', 'नेटवर्क समस्या। डेटा लोड नहीं हो सका।')}
              </Text>
              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => void fetchReports(period)}
                style={styles.retryBtn}
              >
                <Text style={styles.retryBtnText}>{t('Retry', 'रीट्राई')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* 4 Summary Cards Grid */}
          <View style={styles.kpiGrid}>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>{t('Total Sales', 'कुल बिक्री')}</Text>
              <Text style={styles.kpiValueGreen}>
                {currencySymbol}
                {s.totalRevenue.toLocaleString('en-IN')}
              </Text>
              <Text style={styles.kpiSub}>
                {s.totalOrders} {t('bills completed', 'बिल बने')}
              </Text>
            </View>

            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>{t('Net Profit', 'शुद्ध मुनाफ़ा')}</Text>
              <Text style={styles.kpiValueBlue}>
                {currencySymbol}
                {s.netProfit.toLocaleString('en-IN')}
              </Text>
              <Text style={styles.kpiSub}>
                {s.marginPct}% {t('profit margin', 'मुनाफ़ा दर')}
              </Text>
            </View>

            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>{t('GST Collected', 'जीएसटी टैक्स')}</Text>
              <Text style={styles.kpiValuePurple}>
                {currencySymbol}
                {s.gstCollected.toLocaleString('en-IN')}
              </Text>
              <Text style={styles.kpiSub}>{t('Tax liability', 'सरकारी टैक्स')}</Text>
            </View>

            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>{t('Cash in Drawer', 'कैश बैलेंस')}</Text>
              <Text style={styles.kpiValueAmber}>
                {currencySymbol}
                {(data?.daybookSummary?.closingBalance || 0).toLocaleString('en-IN')}
              </Text>
              <Text style={styles.kpiSub}>{t('Cash register', 'गल्ले का कैश')}</Text>
            </View>
          </View>

          {/* Sub-Tab Navigation */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabBar}
          >
            {[
              { id: 'sales', label: t('Sales & Pay', 'बिक्री व पेमेंट') },
              { id: 'items', label: t('Top Items', 'सामान बिक्री') },
              { id: 'gst', label: t('GST & Tax', 'जीएसटी टैक्स') },
              { id: 'daybook', label: t('Daybook', 'डे-बुक रोकड़') },
              { id: 'dues', label: t('Khata Dues', 'उधार बाकी') },
            ].map((tb) => {
              const active = tab === tb.id;
              return (
                <TouchableOpacity
                  key={tb.id}
                  accessibilityRole="button"
                  onPress={() => setTab(tb.id as ReportTab)}
                  style={[styles.tabBtn, active && styles.tabBtnActive]}
                >
                  <Text
                    style={[styles.tabBtnText, active && styles.tabBtnTextActive]}
                  >
                    {tb.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* 1. SALES & PAYMENTS TAB */}
          {tab === 'sales' && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>
                {t('Sales by Payment Mode', 'पेमेंट माध्यम अनुसार बिक्री')}
              </Text>
              {(!data?.salesByMethod || data.salesByMethod.length === 0) ? (
                <Text style={styles.emptyListText}>
                  {t('No payment records for this period', 'इस अवधि के लिए कोई बिक्री दर्ज नहीं है')}
                </Text>
              ) : (
                <View style={styles.divideList}>
                  {data.salesByMethod.map((m: any) => (
                    <View key={m.method} style={styles.listItem}>
                      <View style={styles.methodPill}>
                        <MaterialIcons
                          name={
                            m.method === 'Cash'
                              ? 'payments'
                              : m.method === 'UPI'
                              ? 'qr-code-2'
                              : m.method === 'Card'
                              ? 'credit-card'
                              : 'account-balance-wallet'
                          }
                          size={18}
                          color="#0A6847"
                        />
                        <Text style={styles.methodName}>{m.method}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.methodAmount}>
                          {currencySymbol}
                          {m.amount.toLocaleString('en-IN')}
                        </Text>
                        <Text style={styles.methodPct}>{m.pct}%</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.infoBox}>
                <MaterialIcons name="receipt-long" size={20} color="#0A6847" />
                <Text style={styles.infoBoxText}>
                  {t(
                    'Average bill value for this period is ',
                    'इस अवधि में औसत बिल मूल्य '
                  )}
                  <Text style={{ fontWeight: '700' }}>
                    {currencySymbol}
                    {s.avgOrderValue || 0}
                  </Text>
                </Text>
              </View>
            </View>
          )}

          {/* 2. TOP ITEMS TAB */}
          {tab === 'items' && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>
                {t('Fastest Selling Products', 'सबसे ज़्यादा बिकने वाला सामान')}
              </Text>
              {(!data?.topProducts || data.topProducts.length === 0) ? (
                <Text style={styles.emptyListText}>
                  {t('No product sales recorded yet', 'अभी तक कोई सामान बिक्री नहीं हुई है')}
                </Text>
              ) : (
                <View style={styles.divideList}>
                  {data.topProducts.map((item: any, idx: number) => (
                    <View key={item.name} style={styles.listItem}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                        <View style={styles.rankBadge}>
                          <Text style={styles.rankText}>#{idx + 1}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.itemName} numberOfLines={1}>
                            {item.name}
                          </Text>
                          <Text style={styles.itemCategory}>{item.category || 'General'}</Text>
                        </View>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.itemRevenue}>
                          {currencySymbol}
                          {item.revenue.toLocaleString('en-IN')}
                        </Text>
                        <Text style={styles.itemUnits}>
                          {item.qty} {t('units sold', 'बिक्री')}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* 3. GST & TAX TAB */}
          {tab === 'gst' && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>
                {t('GST Rate-wise Summary (GSTR-1)', 'जीएसटी दर अनुसार टैक्स सारांश')}
              </Text>
              <View style={styles.taxSummaryRow}>
                <View style={styles.taxMetric}>
                  <Text style={styles.taxMetricLabel}>{t('Taxable Sales', 'कर योग्य बिक्री')}</Text>
                  <Text style={styles.taxMetricVal}>
                    {currencySymbol}
                    {(data?.gstSummary?.taxableSales || 0).toLocaleString('en-IN')}
                  </Text>
                </View>
                <View style={styles.taxMetric}>
                  <Text style={styles.taxMetricLabel}>{t('Total Tax', 'कुल टैक्स')}</Text>
                  <Text style={styles.taxMetricValPurple}>
                    {currencySymbol}
                    {(data?.gstSummary?.totalGstCollected || 0).toLocaleString('en-IN')}
                  </Text>
                </View>
              </View>

              {(!data?.gstSummary?.rateBuckets || data.gstSummary.rateBuckets.length === 0) ? (
                <Text style={styles.emptyListText}>
                  {t('No GST tax slab data for this period', 'इस अवधि के लिए कोई जीएसटी स्लैब डेटा नहीं है')}
                </Text>
              ) : (
                <View style={styles.divideList}>
                  {data.gstSummary.rateBuckets.map((rb: any) => (
                    <View key={rb.rate} style={styles.listItem}>
                      <View>
                        <Text style={styles.slabTitle}>
                          {rb.rate} {t('GST Slab', 'जीएसटी दर')}
                        </Text>
                        <Text style={styles.slabTurnover}>
                          {t('Turnover: ', 'टर्नओवर: ')}
                          {currencySymbol}
                          {rb.taxable.toLocaleString('en-IN')}
                        </Text>
                      </View>
                      <Text style={styles.slabTax}>
                        {currencySymbol}
                        {rb.tax.toLocaleString('en-IN')}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* 4. DAYBOOK TAB */}
          {tab === 'daybook' && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>
                {t('Cash Register & Daybook', 'गल्ला व नकद रोकड़')}
              </Text>
              <View style={styles.divideList}>
                <View style={styles.listItem}>
                  <Text style={styles.daybookLabel}>{t('Opening Balance', 'शुरुआती कैश')}</Text>
                  <Text style={styles.daybookVal}>
                    {currencySymbol}
                    {(data?.daybookSummary?.openingBalance || 0).toLocaleString('en-IN')}
                  </Text>
                </View>
                <View style={styles.listItem}>
                  <Text style={styles.daybookLabelGreen}>{t('+ Money In (Sales)', '+ बिक्री नकद')}</Text>
                  <Text style={styles.daybookValGreen}>
                    +{currencySymbol}
                    {(data?.daybookSummary?.moneyIn || 0).toLocaleString('en-IN')}
                  </Text>
                </View>
                <View style={styles.listItem}>
                  <Text style={styles.daybookLabelRed}>{t('- Money Out (Expenses)', '- दुकान के खर्च')}</Text>
                  <Text style={styles.daybookValRed}>
                    -{currencySymbol}
                    {(data?.daybookSummary?.moneyOut || 0).toLocaleString('en-IN')}
                  </Text>
                </View>
                <View style={[styles.listItem, { borderTopWidth: 1.5, borderColor: '#0A6847' }]}>
                  <Text style={styles.daybookLabelBold}>{t('Closing Balance', 'अंतिम कैश बैलेंस')}</Text>
                  <Text style={styles.daybookValBold}>
                    {currencySymbol}
                    {(data?.daybookSummary?.closingBalance || 0).toLocaleString('en-IN')}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* 5. KHATA DUES TAB */}
          {tab === 'dues' && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>
                {t('Customer Udhaar & Aging', 'ग्राहक उधार व अवधि विश्लेषण')}
              </Text>

              <View style={styles.dueBox}>
                <Text style={styles.dueBoxLabel}>{t('Total Customer Udhaar', 'कुल ग्राहक उधार')}</Text>
                <Text style={styles.dueBoxVal}>
                  {currencySymbol}
                  {(data?.khataSummary?.totalReceivables || 0).toLocaleString('en-IN')}
                </Text>
              </View>

              <View style={styles.agingGrid}>
                <View style={styles.agingPillGreen}>
                  <Text style={styles.agingTitle}>{t('0 - 15 Days', '0-15 दिन')}</Text>
                  <Text style={styles.agingVal}>
                    {currencySymbol}
                    {(data?.khataSummary?.aging?.current || 0).toLocaleString('en-IN')}
                  </Text>
                </View>
                <View style={styles.agingPillAmber}>
                  <Text style={styles.agingTitle}>{t('16 - 30 Days', '16-30 दिन')}</Text>
                  <Text style={styles.agingVal}>
                    {currencySymbol}
                    {(data?.khataSummary?.aging?.dueSoon || 0).toLocaleString('en-IN')}
                  </Text>
                </View>
                <View style={styles.agingPillRed}>
                  <Text style={styles.agingTitle}>{t('30+ Days', '30+ दिन')}</Text>
                  <Text style={styles.agingVal}>
                    {currencySymbol}
                    {(data?.khataSummary?.aging?.overdue || 0).toLocaleString('en-IN')}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f6f8f7' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e6ebe8',
    gap: 12,
  },
  backBtn: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: '#f1f5f3',
  },
  shareBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#e6f6f0',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#142d25' },
  headerSub: { fontSize: 11.5, color: '#64748b', marginTop: 1 },
  periodRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e6ebe8',
    gap: 6,
  },
  periodChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#f1f5f3',
  },
  periodChipActive: { backgroundColor: '#0A6847' },
  periodChipText: { fontSize: 12, fontWeight: '600', color: '#475569' },
  periodChipTextActive: { color: '#ffffff', fontWeight: '700' },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: { fontSize: 13, color: '#64748b', fontWeight: '500' },
  scroll: { padding: 14, gap: 14, paddingBottom: 40 },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  kpiCard: {
    width: '48.5%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e6ebe8',
  },
  kpiLabel: { fontSize: 11, fontWeight: '600', color: '#64748b' },
  kpiValueGreen: { fontSize: 19, fontWeight: '800', color: '#0A6847', marginTop: 4 },
  kpiValueBlue: { fontSize: 19, fontWeight: '800', color: '#2563eb', marginTop: 4 },
  kpiValuePurple: { fontSize: 19, fontWeight: '800', color: '#7e22ce', marginTop: 4 },
  kpiValueAmber: { fontSize: 19, fontWeight: '800', color: '#d97706', marginTop: 4 },
  kpiSub: { fontSize: 10.5, color: '#94a3b8', marginTop: 2 },
  tabBar: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  tabBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e6ebe8',
  },
  tabBtnActive: {
    backgroundColor: '#0A6847',
    borderColor: '#0A6847',
  },
  tabBtnText: { fontSize: 12.5, fontWeight: '600', color: '#475569' },
  tabBtnTextActive: { color: '#ffffff', fontWeight: '700' },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e6ebe8',
    gap: 12,
  },
  sectionTitle: { fontSize: 14.5, fontWeight: '700', color: '#111827' },
  divideList: { gap: 10 },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f3',
  },
  methodPill: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  methodName: { fontSize: 13, fontWeight: '600', color: '#1e293b' },
  methodAmount: { fontSize: 14, fontWeight: '700', color: '#111827' },
  methodPct: { fontSize: 11, color: '#64748b' },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#e6f6f0',
    padding: 10,
    borderRadius: 12,
    marginTop: 4,
  },
  infoBoxText: { fontSize: 11.5, color: '#065f46', flex: 1 },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#e6f6f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: { fontSize: 11.5, fontWeight: '700', color: '#0A6847' },
  itemName: { fontSize: 13, fontWeight: '600', color: '#111827' },
  itemCategory: { fontSize: 10.5, color: '#64748b', marginTop: 1 },
  itemRevenue: { fontSize: 13.5, fontWeight: '700', color: '#0A6847' },
  itemUnits: { fontSize: 10.5, color: '#64748b' },
  taxSummaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 6,
  },
  taxMetric: {
    flex: 1,
    backgroundColor: '#fafdfb',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e4efea',
  },
  taxMetricLabel: { fontSize: 11, color: '#64748b' },
  taxMetricVal: { fontSize: 15, fontWeight: '700', color: '#111827', marginTop: 2 },
  taxMetricValPurple: { fontSize: 15, fontWeight: '700', color: '#7e22ce', marginTop: 2 },
  slabTitle: { fontSize: 13, fontWeight: '600', color: '#111827' },
  slabTurnover: { fontSize: 11, color: '#64748b', marginTop: 1 },
  slabTax: { fontSize: 13.5, fontWeight: '700', color: '#0A6847' },
  daybookLabel: { fontSize: 13, color: '#475569' },
  daybookVal: { fontSize: 13.5, fontWeight: '600', color: '#111827' },
  daybookLabelGreen: { fontSize: 13, fontWeight: '600', color: '#0A6847' },
  daybookValGreen: { fontSize: 13.5, fontWeight: '700', color: '#0A6847' },
  daybookLabelRed: { fontSize: 13, fontWeight: '600', color: '#dc2626' },
  daybookValRed: { fontSize: 13.5, fontWeight: '700', color: '#dc2626' },
  daybookLabelBold: { fontSize: 14, fontWeight: '800', color: '#111827' },
  daybookValBold: { fontSize: 16, fontWeight: '800', color: '#0A6847' },
  dueBox: {
    backgroundColor: '#fef2f2',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#fecaca',
    alignItems: 'center',
  },
  dueBoxLabel: { fontSize: 12, color: '#991b1b', fontWeight: '600' },
  dueBoxVal: { fontSize: 24, fontWeight: '800', color: '#b91c1c', marginTop: 2 },
  agingGrid: { flexDirection: 'row', gap: 8, marginTop: 4 },
  agingPillGreen: {
    flex: 1,
    backgroundColor: '#ecfdf5',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#a7f3d0',
    alignItems: 'center',
  },
  agingPillAmber: {
    flex: 1,
    backgroundColor: '#fffbeb',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fde68a',
    alignItems: 'center',
  },
  agingPillRed: {
    flex: 1,
    backgroundColor: '#fef2f2',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
    alignItems: 'center',
  },
  agingTitle: { fontSize: 10.5, fontWeight: '700', color: '#475569' },
  agingVal: { fontSize: 13, fontWeight: '800', color: '#111827', marginTop: 2 },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 12,
    gap: 8,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#991B1B',
    fontWeight: '500',
  },
  retryBtn: {
    backgroundColor: '#991B1B',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '700',
  },
  emptyListText: {
    fontSize: 13,
    color: '#94A3B8',
    fontStyle: 'italic',
    paddingVertical: 14,
    textAlign: 'center',
  },
});
