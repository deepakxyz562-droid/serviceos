import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Share,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Screen, Card, ui, colors } from '../src/components/ui';
import { apiRequest } from '../src/lib/api';

interface MonthlyCurve {
  month: string;
  interactions: number;
  enquiries: number;
  qualified: number;
  won: number;
  revenue: number;
}

interface ReportData {
  businessName: string;
  funnel: {
    tier1_interactions: { total: number };
    tier2_enquiries: { total: number; conversionFromTier1Percent: number };
    tier3_qualified: { total: number; conversionFromTier2Percent: number };
    tier4_revenue: {
      wonDeals: number;
      totalRevenue: number;
      currency: string;
      conversionFromTier3Percent: number;
    };
  };
  monthlyCurves: MonthlyCurve[];
  reputationSummary: {
    avgRating: number;
    totalReviews: number;
    responseRate: number;
  };
  aiExecutiveSummary: string;
}

export default function GrowthReportScreen() {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<ReportData | null>(null);

  const loadReport = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<ReportData>('/api/bgos/reports/4-tier');
      setReport(data);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to load growth report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, []);

  const handleShareReport = async () => {
    if (!report) return;
    try {
      await Share.share({
        title: `${report.businessName} - Executive Growth Report`,
        message: `📊 ${report.businessName} Growth Report\n\n${report.aiExecutiveSummary}\n\n• Tier 1 Interactions: ${report.funnel.tier1_interactions.total}\n• Tier 2 Enquiries: ${report.funnel.tier2_enquiries.total} (${report.funnel.tier2_enquiries.conversionFromTier1Percent}%)\n• Tier 3 Qualified Leads: ${report.funnel.tier3_qualified.total} (${report.funnel.tier3_qualified.conversionFromTier2Percent}%)\n• Tier 4 Won Deals: ${report.funnel.tier4_revenue.wonDeals} (${report.funnel.tier4_revenue.currency} ${report.funnel.tier4_revenue.totalRevenue.toLocaleString()})\n• Reputation: ${report.reputationSummary.avgRating}★ (${report.reputationSummary.totalReviews} reviews)`,
      });
    } catch {}
  };

  const funnel = report?.funnel;

  return (
    <Screen
      title="4-Tier Executive Growth Report"
      subtitle="Honest customer acquisition & revenue compounding telemetry."
      onRefresh={loadReport}
    >
      {loading && !report ? (
        <View style={{ padding: 40, alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.brand} />
          <Text style={{ marginTop: 12, color: colors.muted, fontSize: 13 }}>
            Computing 4-tier conversion funnel...
          </Text>
        </View>
      ) : (
        <View style={{ gap: 16 }}>
          {/* Header Card */}
          <Card style={{ backgroundColor: '#F8FAFC', borderColor: '#E2E8F0', borderWidth: 1 }}>
            <View style={[ui.row, { justifyContent: 'space-between' }]}>
              <View>
                <Text style={{ fontSize: 18, fontWeight: '800', color: colors.ink }}>
                  {report?.businessName}
                </Text>
                <Text style={{ fontSize: 11.5, color: colors.muted, marginTop: 2 }}>
                  Compounding Growth Report • October 2026
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <MaterialIcons name="star" size={16} color="#F59E0B" />
                  <Text style={{ fontSize: 14, fontWeight: '800', color: colors.ink }}>
                    {report?.reputationSummary.avgRating.toFixed(1)}
                  </Text>
                </View>
                <Text style={{ fontSize: 10, color: colors.muted }}>
                  {report?.reputationSummary.totalReviews} reviews • {report?.reputationSummary.responseRate}% replied
                </Text>
              </View>
            </View>
          </Card>

          {/* AI Executive Summary Callout */}
          <Card
            style={{
              backgroundColor: '#F0FDF4',
              borderColor: '#BBF7D0',
              borderWidth: 1.5,
              gap: 8,
            }}
          >
            <View style={[ui.row, { gap: 6 }]}>
              <Text style={{ fontSize: 18 }}>🤖</Text>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#166534' }}>
                AI Growth Employee Executive Briefing
              </Text>
            </View>
            <Text style={{ fontSize: 12.5, color: '#14532D', lineHeight: 18 }}>
              {report?.aiExecutiveSummary}
            </Text>
          </Card>

          {/* 4-Tier Funnel Cards */}
          <View style={{ gap: 10 }}>
            <Text style={ui.heading}>4-Tier Funnel Telemetry</Text>

            {/* Tier 1 */}
            <Card style={{ borderLeftWidth: 4, borderLeftColor: '#3B82F6' }}>
              <View style={[ui.row, { justifyContent: 'space-between' }]}>
                <View>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B' }}>
                    TIER 1: INTERACTIONS
                  </Text>
                  <Text style={{ fontSize: 20, fontWeight: '900', color: colors.ink, marginTop: 2 }}>
                    {funnel?.tier1_interactions.total.toLocaleString()}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>
                    Google Search & Maps impressions, direction & call clicks
                  </Text>
                </View>
                <MaterialIcons name="visibility" size={24} color="#3B82F6" />
              </View>
            </Card>

            {/* Tier 2 */}
            <Card style={{ borderLeftWidth: 4, borderLeftColor: '#10B981' }}>
              <View style={[ui.row, { justifyContent: 'space-between' }]}>
                <View>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B' }}>
                    TIER 2: ENQUIRIES
                  </Text>
                  <Text style={{ fontSize: 20, fontWeight: '900', color: colors.ink, marginTop: 2 }}>
                    {funnel?.tier2_enquiries.total.toLocaleString()}
                  </Text>
                  <Text style={{ fontSize: 11, color: '#10B981', fontWeight: '700', marginTop: 2 }}>
                    {funnel?.tier2_enquiries.conversionFromTier1Percent}% conversion from Tier 1
                  </Text>
                </View>
                <MaterialIcons name="chat" size={24} color="#10B981" />
              </View>
            </Card>

            {/* Tier 3 */}
            <Card style={{ borderLeftWidth: 4, borderLeftColor: '#F59E0B' }}>
              <View style={[ui.row, { justifyContent: 'space-between' }]}>
                <View>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B' }}>
                    TIER 3: QUALIFIED LEADS
                  </Text>
                  <Text style={{ fontSize: 20, fontWeight: '900', color: colors.ink, marginTop: 2 }}>
                    {funnel?.tier3_qualified.total.toLocaleString()}
                  </Text>
                  <Text style={{ fontSize: 11, color: '#D97706', fontWeight: '700', marginTop: 2 }}>
                    {funnel?.tier3_qualified.conversionFromTier2Percent}% conversion from Enquiries
                  </Text>
                </View>
                <MaterialIcons name="fact-check" size={24} color="#F59E0B" />
              </View>
            </Card>

            {/* Tier 4 */}
            <Card style={{ borderLeftWidth: 4, borderLeftColor: '#8B5CF6' }}>
              <View style={[ui.row, { justifyContent: 'space-between' }]}>
                <View>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B' }}>
                    TIER 4: REVENUE & WON DEALS
                  </Text>
                  <Text style={{ fontSize: 20, fontWeight: '900', color: '#0F172A', marginTop: 2 }}>
                    {funnel?.tier4_revenue.currency}{' '}
                    {funnel?.tier4_revenue.totalRevenue.toLocaleString()}
                  </Text>
                  <Text style={{ fontSize: 11, color: '#7C3AED', fontWeight: '700', marginTop: 2 }}>
                    {funnel?.tier4_revenue.wonDeals} Won Deals (
                    {funnel?.tier4_revenue.conversionFromTier3Percent}% closure rate)
                  </Text>
                </View>
                <MaterialIcons name="monetization-on" size={24} color="#8B5CF6" />
              </View>
            </Card>
          </View>

          {/* 6-Month Compounding Historical Table */}
          <Card>
            <Text style={ui.heading}>6-Month Historical Compounding</Text>
            <Text style={{ fontSize: 11.5, color: colors.muted, marginBottom: 10 }}>
              Consistent posting and reputation management compounds local rankings over 90–180 days.
            </Text>

            <View style={{ gap: 8 }}>
              {(report?.monthlyCurves || []).map((m) => (
                <View
                  key={m.month}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingVertical: 8,
                    borderBottomWidth: 1,
                    borderBottomColor: '#F1F5F9',
                  }}
                >
                  <Text style={{ fontSize: 12.5, fontWeight: '800', color: colors.ink, width: 60 }}>
                    {m.month}
                  </Text>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 11, color: colors.muted }}>Interactions</Text>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: colors.ink }}>
                      {m.interactions}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 11, color: colors.muted }}>Leads</Text>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: colors.ink }}>
                      {m.qualified}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', width: 90 }}>
                    <Text style={{ fontSize: 11, color: '#16A34A', fontWeight: '800' }}>
                      {m.won} won
                    </Text>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: colors.ink }}>
                      {funnel?.tier4_revenue.currency} {m.revenue.toLocaleString()}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </Card>

          {/* Action: Share / Export Report */}
          <View style={{ gap: 10, marginBottom: 30 }}>
            <Pressable
              onPress={handleShareReport}
              style={{
                backgroundColor: colors.brand,
                paddingVertical: 14,
                borderRadius: 14,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 8,
              }}
            >
              <MaterialIcons name="share" size={20} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>
                Share Executive Growth Briefing
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </Screen>
  );
}
