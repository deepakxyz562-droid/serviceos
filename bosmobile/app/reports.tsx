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
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { Paths, File as ExpoFile } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { hapticFeedback } from '@/lib/haptics';
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
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportingType, setExportingType] = useState<'pdf' | 'csv' | null>(null);

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

  const getPeriodLabel = () => {
    return period === 'today'
      ? t('Today', 'आज')
      : period === 'yesterday'
      ? t('Yesterday', 'कल')
      : period === 'this_week'
      ? t('This Week', 'इस हफ़्ते')
      : period === 'this_month'
      ? t('This Month', 'इस महीने')
      : t('This Year (FY)', 'इस साल');
  };

  const handleShareReport = async () => {
    if (!data?.summary) return;
    const storeName = blueprint.businessName || 'BOS Store';
    const periodName = getPeriodLabel();

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

  const handleExportPdfReport = async () => {
    if (!data?.summary) return;
    try {
      setExportingType('pdf');
      const storeName = blueprint.businessName || 'Business Store';
      const periodLabel = getPeriodLabel();
      const dateStr = new Date().toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });

      const topProductsHtml = (data.topProducts || [])
        .slice(0, 10)
        .map(
          (p: any, i: number) => `
          <tr>
            <td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0; text-align: center;">${i + 1}</td>
            <td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0; font-weight: 600;">${p.name || 'Product'}</td>
            <td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0; text-align: center;">${p.qty || 0}</td>
            <td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 700;">${currencySymbol}${(p.revenue || 0).toLocaleString('en-IN')}</td>
          </tr>
        `
        )
        .join('');

      const paymentModesHtml = (data.salesByMethod || [])
        .map(
          (m: any) => `
          <tr>
            <td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0; font-weight: 600;">${m.method || 'Payment'}</td>
            <td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0; text-align: center;">${m.count || 0}</td>
            <td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 700;">${currencySymbol}${(m.total || 0).toLocaleString('en-IN')}</td>
            <td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #64748b;">${m.pct || 0}%</td>
          </tr>
        `
        )
        .join('');

      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${storeName} - Business Summary Report</title>
  <style>
    @page { size: A4; margin: 12mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; margin: 0; padding: 20px; font-size: 12px; }
    .header-box { border-bottom: 2px solid #0A6847; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-start; }
    .title { font-size: 20px; font-weight: 900; color: #0A6847; margin: 0 0 4px 0; }
    .subtitle { font-size: 12px; color: #64748b; margin: 0; }
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 18px; }
    .kpi-card { border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 12px; background: #f8fafc; }
    .kpi-label { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 4px; }
    .kpi-value { font-size: 16px; font-weight: 900; color: #0f172a; }
    .kpi-sub { font-size: 10px; color: #059669; font-weight: 600; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 11px; }
    th { background: #f1f5f9; padding: 8px 10px; text-align: left; font-weight: 800; color: #334155; border-bottom: 2px solid #cbd5e1; }
    .section-title { font-size: 13px; font-weight: 800; color: #1e293b; margin: 14px 0 8px 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
    .footer { font-size: 10px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 10px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="header-box">
    <div>
      <h1 class="title">${storeName}</h1>
      <p class="subtitle">Executive Business &amp; Financial Summary Report</p>
    </div>
    <div style="text-align: right;">
      <div style="font-weight: 800; font-size: 12px; color: #0A6847; background: #e6f6f0; padding: 4px 10px; border-radius: 6px; display: inline-block;">
        Period: ${periodLabel}
      </div>
      <div style="color: #64748b; font-size: 10px; margin-top: 4px;">Generated on: ${dateStr}</div>
    </div>
  </div>

  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-label">Total Revenue</div>
      <div class="kpi-value">${currencySymbol}${data.summary.totalRevenue.toLocaleString('en-IN')}</div>
      <div class="kpi-sub">${data.summary.totalOrders} total bills</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Gross Profit</div>
      <div class="kpi-value">${currencySymbol}${data.summary.grossProfit.toLocaleString('en-IN')}</div>
      <div class="kpi-sub">Margin: ${data.summary.marginPct}%</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Expenses</div>
      <div class="kpi-value" style="color: #dc2626;">${currencySymbol}${data.summary.totalExpenses.toLocaleString('en-IN')}</div>
      <div class="kpi-sub" style="color: #64748b;">Operating cost</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Net Profit</div>
      <div class="kpi-value" style="color: #059669;">${currencySymbol}${data.summary.netProfit.toLocaleString('en-IN')}</div>
      <div class="kpi-sub">Bottom line profit</div>
    </div>
  </div>

  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-label">Cash in Drawer</div>
      <div class="kpi-value">${currencySymbol}${(data.daybookSummary?.closingBalance || 0).toLocaleString('en-IN')}</div>
      <div class="kpi-sub" style="color: #64748b;">In: ${currencySymbol}${(data.daybookSummary?.moneyIn || 0).toLocaleString('en-IN')} | Out: ${currencySymbol}${(data.daybookSummary?.moneyOut || 0).toLocaleString('en-IN')}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">GST Tax Collected</div>
      <div class="kpi-value">${currencySymbol}${data.summary.gstCollected.toLocaleString('en-IN')}</div>
      <div class="kpi-sub" style="color: #64748b;">CGST + SGST</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Customer Udhaar / Dues</div>
      <div class="kpi-value" style="color: #d97706;">${currencySymbol}${(data.khataSummary?.totalReceivables || 0).toLocaleString('en-IN')}</div>
      <div class="kpi-sub" style="color: #64748b;">Khata Receivables</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Average Bill Ticket</div>
      <div class="kpi-value">${currencySymbol}${Math.round(data.summary.avgOrderValue || 0).toLocaleString('en-IN')}</div>
      <div class="kpi-sub" style="color: #64748b;">Per customer order</div>
    </div>
  </div>

  <div class="section-title">Sales by Payment Mode</div>
  <table>
    <thead>
      <tr>
        <th>Payment Mode</th>
        <th style="text-align: center;">Transactions</th>
        <th style="text-align: right;">Total Amount</th>
        <th style="text-align: right;">Share %</th>
      </tr>
    </thead>
    <tbody>
      ${paymentModesHtml || '<tr><td colspan="4" style="text-align:center; padding: 12px; color: #94a3b8;">No payment data recorded</td></tr>'}
    </tbody>
  </table>

  <div class="section-title">Top Performing Items / Services</div>
  <table>
    <thead>
      <tr>
        <th style="width: 40px; text-align: center;">#</th>
        <th>Product / Service</th>
        <th style="text-align: center;">Qty Sold</th>
        <th style="text-align: right;">Revenue</th>
      </tr>
    </thead>
    <tbody>
      ${topProductsHtml || '<tr><td colspan="4" style="text-align:center; padding: 12px; color: #94a3b8;">No product sales recorded in this period</td></tr>'}
    </tbody>
  </table>

  <div class="footer">
    Generated automatically by BOS Billing &amp; Retail Operating System • Confidential Business Record
  </div>
</body>
</html>
      `;

      const { uri } = await Print.printToFileAsync({ html, base64: false });
      setExportModalOpen(false);

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `${storeName} Financial Report`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('PDF Created', `Report PDF generated at: ${uri}`);
      }
    } catch (err: any) {
      Alert.alert('PDF Export Error', err?.message || 'Could not export PDF report.');
    } finally {
      setExportingType(null);
    }
  };

  const handleExportCsvReport = async () => {
    if (!data?.summary) return;
    try {
      setExportingType('csv');
      const storeName = blueprint.businessName || 'Business Store';
      const periodLabel = getPeriodLabel();
      const today = new Date().toISOString().slice(0, 10);

      const rows: string[] = [
        `"BOS Business Report - ${storeName}"`,
        `"Period","${periodLabel}"`,
        `"Export Date","${today}"`,
        ``,
        `"--- KEY FINANCIAL METRICS ---"`,
        `"Metric","Value"`,
        `"Total Revenue","${data.summary.totalRevenue || 0}"`,
        `"Gross Profit","${data.summary.grossProfit || 0}"`,
        `"Operating Expenses","${data.summary.totalExpenses || 0}"`,
        `"Net Profit","${data.summary.netProfit || 0}"`,
        `"Gross Margin Pct","${data.summary.marginPct || 0}%"`,
        `"Total Orders / Bills","${data.summary.totalOrders || 0}"`,
        `"Average Order Value","${Math.round(data.summary.avgOrderValue || 0)}"`,
        `"GST Tax Collected","${data.summary.gstCollected || 0}"`,
        `"Cash in Drawer Closing","${data.daybookSummary?.closingBalance || 0}"`,
        `"Khata Receivables (Dues)","${data.khataSummary?.totalReceivables || 0}"`,
        ``,
        `"--- SALES BY PAYMENT MODE ---"`,
        `"Payment Mode","Bills Count","Total Amount","Share Pct"`,
        ...(data.salesByMethod || []).map(
          (m: any) => `"${m.method || 'Other'}","${m.count || 0}","${m.total || 0}","${m.pct || 0}%"`
        ),
        ``,
        `"--- TOP SELLING PRODUCTS / SERVICES ---"`,
        `"Product Name","Qty Sold","Total Revenue"`,
        ...(data.topProducts || []).map(
          (p: any) => `"${(p.name || '').replace(/"/g, '""')}","${p.qty || 0}","${p.revenue || 0}"`
        ),
      ];

      const csvContent = rows.join('\n');

      if (Platform.OS === 'web') {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${storeName.replace(/\s+/g, '_')}_Report_${today}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        setExportModalOpen(false);
        Alert.alert('Report Exported ✓', 'Business report downloaded as CSV.');
        return;
      }

      const filename = `${storeName.replace(/[^a-zA-Z0-9]/g, '_')}_Report_${today}.csv`;
      const file = new ExpoFile(Paths.cache, filename);
      file.create();
      file.write(csvContent);
      setExportModalOpen(false);

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'text/csv',
          dialogTitle: 'Export Business Report CSV',
          UTI: 'public.comma-separated-values-text',
        });
      } else {
        await Share.share({ message: csvContent, title: 'Business Report' });
      }
    } catch (err: any) {
      Alert.alert('CSV Export Error', err?.message || 'Could not export CSV report.');
    } finally {
      setExportingType(null);
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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => setExportModalOpen(true)}
            style={[styles.shareBtn, { backgroundColor: '#e0e7ff' }]}
            accessibilityLabel="Export Report"
          >
            <MaterialIcons name="download" size={20} color="#4338ca" />
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={handleShareReport}
            style={styles.shareBtn}
            accessibilityLabel="Share Report"
          >
            <MaterialIcons name="share" size={20} color="#0A6847" />
          </TouchableOpacity>
        </View>
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

      {/* Export Options Modal */}
      <Modal
        visible={exportModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setExportModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {t('Export Business Report', 'व्यापार रिपोर्ट एक्सपोर्ट')}
                </Text>
                <Text style={styles.modalSub}>
                  {t('Download or share executive reports and data', 'पीडीएफ या एक्सेल फॉर्मेट में सेव करें')}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setExportModalOpen(false)}
                style={styles.modalCloseBtn}
              >
                <MaterialIcons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={{ gap: 10, marginTop: 14 }}>
              {/* Option 1: PDF */}
              <TouchableOpacity
                onPress={handleExportPdfReport}
                disabled={exportingType !== null}
                style={styles.exportOptionCard}
                activeOpacity={0.8}
              >
                <View style={[styles.exportOptionIcon, { backgroundColor: '#fee2e2' }]}>
                  <MaterialIcons name="picture-as-pdf" size={24} color="#dc2626" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.exportOptionTitle}>
                    {t('Download PDF Report (A4)', 'पीडीएफ रिपोर्ट डाउनलोड करें (A4)')}
                  </Text>
                  <Text style={styles.exportOptionSub}>
                    {t('Professional print-ready document with business letterhead & graphs', 'लेटरहेड, पी&एल और बिक्री चार्ट के साथ')}
                  </Text>
                </View>
                {exportingType === 'pdf' ? (
                  <ActivityIndicator size="small" color="#dc2626" />
                ) : (
                  <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
                )}
              </TouchableOpacity>

              {/* Option 2: CSV */}
              <TouchableOpacity
                onPress={handleExportCsvReport}
                disabled={exportingType !== null}
                style={styles.exportOptionCard}
                activeOpacity={0.8}
              >
                <View style={[styles.exportOptionIcon, { backgroundColor: '#dcfce7' }]}>
                  <MaterialIcons name="table-view" size={24} color="#059669" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.exportOptionTitle}>
                    {t('Export CSV / Excel Sheet', 'एक्सेल / सीएसवी डाउनलोड करें')}
                  </Text>
                  <Text style={styles.exportOptionSub}>
                    {t('Raw financial rows, payment modes & item sales data', 'अकाउंटेंट और टैली के लिए संपूर्ण डेटा')}
                  </Text>
                </View>
                {exportingType === 'csv' ? (
                  <ActivityIndicator size="small" color="#059669" />
                ) : (
                  <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
                )}
              </TouchableOpacity>

              {/* Option 3: WhatsApp Share */}
              <TouchableOpacity
                onPress={() => {
                  setExportModalOpen(false);
                  void handleShareReport();
                }}
                style={styles.exportOptionCard}
                activeOpacity={0.8}
              >
                <View style={[styles.exportOptionIcon, { backgroundColor: '#e0f2fe' }]}>
                  <MaterialIcons name="send" size={22} color="#0284c7" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.exportOptionTitle}>
                    {t('Share Quick Summary on WhatsApp', 'व्हाट्सएप पर समरी भेजें')}
                  </Text>
                  <Text style={styles.exportOptionSub}>
                    {t('Send key numbers and profit margin directly to partners', 'पार्टनर या सीए को संदेश भेजें')}
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  exportOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  exportOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportOptionTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0f172a',
  },
  exportOptionSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
    lineHeight: 15,
  },
});
