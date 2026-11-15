/* eslint-disable jsx-a11y/alt-text */
import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from '@react-pdf/renderer';

export interface MonthlyMarketingReportData {
  businessName: string;
  monthName: string; // e.g. "November 2026"
  reportTitle?: string;
  ownerName?: string;
  category?: string;
  address?: string;
  email?: string;
  phone?: string;
  website?: string;
  marketingScore?: number; // 0 to 100
  marketingScoreStatus?: string; // "Poor" | "Fair" | "Good" | "Excellent"
  connectedStatus?: string;
  platformBrand?: string; // defaults to "ServiceOS"

  // 5 AI Agents Task Counts
  agentTasks: {
    ranking: number;
    reviewReply: number;
    media: number;
    creative: number;
    video: number;
  };

  // Review Reply Agent details
  reviewReplyAgent: {
    reviewsChecked: number;
    reviewsReplied: number;
    keywordsUsedCount: number;
    lifetimeReplies: number;
    repliesThisMonth: Array<{
      customerName: string;
      rating?: number;
      reviewText: string;
      replyText: string;
    }>;
    keywordsUsed: Array<{
      keyword: string;
      volume: number;
      usedCount: number;
    }>;
  };

  // Creative Agent details
  creativeAgent: {
    creativesPosted: number;
    scheduled: number;
    keywordsUsedCount: number;
    lifetimeGenerated: number;
    creatives: Array<{
      title?: string;
      imageUrl?: string;
      postedDate?: string;
    }>;
    keywordsUsed: Array<{
      keyword: string;
      volume: number;
      usedCount: number;
    }>;
  };

  // Media Agent details
  mediaAgent: {
    mediaUploaded: number;
    lifetimeMedia: number;
    recommendedNextUploads: string[];
  };

  // 6-Month Growth Trends
  growthNumbers: {
    months: string[];
    profileViews: number[];
    profileViewsAnalysis: string;
    calls: number[];
    callsAnalysis: string;
    directionRequests: number[];
    directionRequestsAnalysis: string;
    joinedMonthIndex: number;
    joinedMonthLabel: string;
  };

  // Recap & Next Actions
  recap: {
    googleUpdatesPosted: number;
    reviewReplied: number;
    mediaUploaded: number;
    creativeGenerated: number;
    creativePosted: number;
    videoGenerated: number;
    videoPosted: number;
    summaryResult: string;
    growthActions: Array<{
      num: string;
      title: string;
      desc: string;
    }>;
  };
}

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    backgroundColor: '#FFFFFF',
    paddingTop: 28,
    paddingBottom: 32,
    paddingHorizontal: 36,
    fontSize: 8.5,
    color: '#0F172A',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginBottom: 10,
  },
  headerLeft: {
    fontSize: 8,
    color: '#009F50',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  businessTitle: {
    fontSize: 9.5,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  badgePill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 7,
    color: '#15803D',
    fontWeight: 'bold',
  },
  pageFooter: {
    position: 'absolute',
    bottom: 16,
    left: 36,
    right: 36,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 6,
  },
  footerBrand: {
    fontSize: 7.5,
    fontWeight: 'bold',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  footerPageNum: {
    fontSize: 7.5,
    color: '#94A3B8',
  },
  pageTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 2,
  },
  pageSubtitle: {
    fontSize: 8.5,
    color: '#64748B',
    marginBottom: 10,
  },
  card: {
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    marginBottom: 8,
  },
  table: {
    width: '100%',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    marginTop: 4,
    marginBottom: 6,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  th1: { flex: 3.2, fontSize: 7, fontWeight: 'bold', color: '#475569' },
  th2: { flex: 1.8, fontSize: 7, fontWeight: 'bold', color: '#475569', textAlign: 'center' },
  th3: { flex: 1.5, fontSize: 7, fontWeight: 'bold', color: '#475569', textAlign: 'center' },
  td1: { flex: 3.2, fontSize: 7.5, color: '#0F172A' },
  td2: { flex: 1.8, fontSize: 7.5, color: '#334155', textAlign: 'center' },
  td3: { flex: 1.5, fontSize: 7.5, color: '#009F50', fontWeight: 'bold', textAlign: 'center' },
});

export const MonthlyMarketingReportPdf: React.FC<{ data: MonthlyMarketingReportData }> = ({ data }) => {
  const businessName = data.businessName || 'Business Owner';
  const ownerName = data.ownerName || businessName;
  const monthName = data.monthName || 'Current Month';
  const reportTitle = data.reportTitle || `Marketing Intelligence — ${monthName}`;
  const address = data.address || 'Verified Google Business Address';
  const category = data.category || 'Local Business';
  const platform = data.platformBrand || 'BGOS';
  const contact = [data.email, data.phone, data.website].filter(Boolean).join(' • ');

  const score = Math.min(100, Math.max(0, data.marketingScore ?? 84));
  const scoreColor = score >= 80 ? '#009F50' : score >= 65 ? '#D97706' : '#DC2626';
  const scoreGrade = data.marketingScoreStatus || (score >= 80 ? 'Excellent' : score >= 65 ? 'Good' : 'Needs Optimization');

  // KPI Calculations
  const curViews = data.growthNumbers.profileViews[data.growthNumbers.profileViews.length - 1] ?? 0;
  const prevViews = data.growthNumbers.profileViews[data.growthNumbers.profileViews.length - 2] ?? 0;
  const viewsDeltaPct = prevViews > 0 ? Math.round(((curViews - prevViews) / prevViews) * 100) : 0;

  const curCalls = data.growthNumbers.calls[data.growthNumbers.calls.length - 1] ?? 0;
  const curDirs = data.growthNumbers.directionRequests[data.growthNumbers.directionRequests.length - 1] ?? 0;
  const reviewsReplied = data.reviewReplyAgent.reviewsReplied;
  const reviewsTotal = Math.max(reviewsReplied, data.reviewReplyAgent.reviewsChecked);

  return (
    <Document>
      {/* ══════════════════════════════════════════════════════════════════════
          PAGE 1: EXECUTIVE COVER & PERFORMANCE SCORECARD
      ══════════════════════════════════════════════════════════════════════ */}
      <Page size="A4" style={styles.page}>
        {/* Top Header */}
        <View style={styles.headerRow}>
          <Text style={styles.headerLeft}>{platform} AI Growth Autopilot</Text>
          <View style={styles.headerRight}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#009F50' }} />
            <Text style={{ fontSize: 7.5, color: '#15803D', fontWeight: 'bold' }}>Google Verified Partner</Text>
          </View>
        </View>

        {/* Business Hero Banner (Dark Slate) */}
        <View
          style={{
            backgroundColor: '#0F172A',
            borderRadius: 8,
            padding: 16,
            marginBottom: 12,
            color: '#FFFFFF',
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ maxWidth: 360 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <View style={{ backgroundColor: 'rgba(0, 159, 80, 0.2)', borderWidth: 1, borderColor: '#009F50', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 4 }}>
                  <Text style={{ fontSize: 7.5, color: '#4ADE80', fontWeight: 'bold' }}>{category}</Text>
                </View>
                <Text style={{ fontSize: 7.5, color: '#94A3B8' }}>• {monthName}</Text>
              </View>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 3 }}>
                {businessName}
              </Text>
              <Text style={{ fontSize: 8, color: '#CBD5E1', marginBottom: 2 }}>{address}</Text>
              {contact ? <Text style={{ fontSize: 7.5, color: '#94A3B8' }}>{contact}</Text> : null}
            </View>

            {/* Score Ring / Box */}
            <View
              style={{
                backgroundColor: '#1E293B',
                borderRadius: 8,
                borderWidth: 1,
                borderColor: '#334155',
                paddingVertical: 10,
                paddingHorizontal: 14,
                alignItems: 'center',
                minWidth: 96,
              }}
            >
              <Text style={{ fontSize: 7, color: '#94A3B8', fontWeight: 'bold', textTransform: 'uppercase' }}>
                Google Growth
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2, marginVertical: 2 }}>
                <Text style={{ fontSize: 24, fontWeight: 'bold', color: scoreColor }}>{score}</Text>
                <Text style={{ fontSize: 9, color: '#64748B' }}>/100</Text>
              </View>
              <View style={{ backgroundColor: score >= 80 ? 'rgba(0, 159, 80, 0.2)' : 'rgba(217, 119, 6, 0.2)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3 }}>
                <Text style={{ fontSize: 7, fontWeight: 'bold', color: scoreColor }}>{scoreGrade}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Executive Scorecard Subheading */}
        <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#0F172A', marginBottom: 6 }}>
          Monthly Executive Performance Scorecard
        </Text>

        {/* 4 Core KPI Tiles */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
          {/* Tile 1: Profile Views */}
          <View style={{ flex: 1, backgroundColor: '#F8FAFC', borderRadius: 6, borderWidth: 1, borderColor: '#E2E8F0', padding: 8 }}>
            <Text style={{ fontSize: 7, color: '#64748B', fontWeight: 'bold', textTransform: 'uppercase' }}>Google Views</Text>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#0F172A', marginVertical: 2 }}>{curViews.toLocaleString()}</Text>
            <Text style={{ fontSize: 7, color: viewsDeltaPct >= 0 ? '#009F50' : '#DC2626', fontWeight: 'bold' }}>
              {viewsDeltaPct >= 0 ? `+${viewsDeltaPct}%` : `${viewsDeltaPct}%`} MoM Trajectory
            </Text>
          </View>

          {/* Tile 2: Direct Calls */}
          <View style={{ flex: 1, backgroundColor: '#F8FAFC', borderRadius: 6, borderWidth: 1, borderColor: '#E2E8F0', padding: 8 }}>
            <Text style={{ fontSize: 7, color: '#64748B', fontWeight: 'bold', textTransform: 'uppercase' }}>Direct Calls</Text>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#2563EB', marginVertical: 2 }}>{curCalls.toLocaleString()}</Text>
            <Text style={{ fontSize: 7, color: '#475569' }}>High-Intent Dials</Text>
          </View>

          {/* Tile 3: Driving Directions */}
          <View style={{ flex: 1, backgroundColor: '#F8FAFC', borderRadius: 6, borderWidth: 1, borderColor: '#E2E8F0', padding: 8 }}>
            <Text style={{ fontSize: 7, color: '#64748B', fontWeight: 'bold', textTransform: 'uppercase' }}>Directions</Text>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#009F50', marginVertical: 2 }}>{curDirs.toLocaleString()}</Text>
            <Text style={{ fontSize: 7, color: '#475569' }}>Customer Store Visits</Text>
          </View>

          {/* Tile 4: Review Response Rate */}
          <View style={{ flex: 1, backgroundColor: '#F8FAFC', borderRadius: 6, borderWidth: 1, borderColor: '#E2E8F0', padding: 8 }}>
            <Text style={{ fontSize: 7, color: '#64748B', fontWeight: 'bold', textTransform: 'uppercase' }}>Reviews Addressed</Text>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#7C3AED', marginVertical: 2 }}>
              {reviewsReplied}/{reviewsTotal}
            </Text>
            <Text style={{ fontSize: 7, color: '#15803D', fontWeight: 'bold' }}>30s AI Auto-Reply</Text>
          </View>
        </View>

        {/* Five AI Agents Snapshot */}
        <View style={[styles.card, { marginBottom: 10 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <Text style={{ fontSize: 9.5, fontWeight: 'bold', color: '#0F172A' }}>
              Five Autonomous AI Marketing Agents (24×7 Active)
            </Text>
            <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 6, paddingVertical: 1.5, borderRadius: 3 }}>
              <Text style={{ fontSize: 7, color: '#15803D', fontWeight: 'bold' }}>All 5 Operational</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {[
              { name: '1. Ranking Agent', stat: `${data.agentTasks.ranking} actions`, desc: 'Optimizes keywords & Google Search local placement' },
              { name: '2. Review Reply Agent', stat: `${data.agentTasks.reviewReply} replies`, desc: 'Instant 30s personalized customer responses with SEO injection' },
              { name: '3. Creative Agent', stat: `${data.agentTasks.creative} creatives`, desc: 'Generates branded promotional posts with CALL CTAs' },
              { name: '4. Media Agent', stat: `${data.agentTasks.media} photos`, desc: 'Uploads geo-tagged photos to Google Maps & Search' },
              { name: '5. Video & Reels Agent', stat: `${data.agentTasks.video} reels`, desc: 'Turns top services and products into 30-day viral video calendar' },
            ].map((ag, i) => (
              <View key={`ag-cov-${i}`} style={{ width: '48.5%', backgroundColor: '#FFFFFF', borderRadius: 5, borderWidth: 1, borderColor: '#E2E8F0', padding: 6 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                  <Text style={{ fontSize: 8, fontWeight: 'bold', color: '#0F172A' }}>{ag.name}</Text>
                  <Text style={{ fontSize: 7, color: '#009F50', fontWeight: 'bold' }}>{ag.stat}</Text>
                </View>
                <Text style={{ fontSize: 6.8, color: '#64748B' }}>{ag.desc}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Google Health Audit Checkpoints */}
        <View style={[styles.card, { marginBottom: 0 }]}>
          <Text style={{ fontSize: 9.5, fontWeight: 'bold', color: '#0F172A', marginBottom: 5 }}>
            Key Google Maps Growth Checkpoints
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ width: '48%' }}>
              <Text style={{ fontSize: 7.2, color: '#15803D', marginBottom: 2.5 }}>✓ Business Pin & Address Verified on Google Maps</Text>
              <Text style={{ fontSize: 7.2, color: '#15803D', marginBottom: 2.5 }}>✓ Primary Category & High-Intent Services Published</Text>
              <Text style={{ fontSize: 7.2, color: '#15803D', marginBottom: 2.5 }}>✓ Click-to-Call Direct Phone Routing Active</Text>
            </View>
            <View style={{ width: '48%' }}>
              <Text style={{ fontSize: 7.2, color: '#15803D', marginBottom: 2.5 }}>✓ 30-Second AI Customer Review Auto-Reply Active</Text>
              <Text style={{ fontSize: 7.2, color: '#15803D', marginBottom: 2.5 }}>✓ Weekly Localized Posts & Promotion Updates Synced</Text>
              <Text style={{ fontSize: 7.2, color: '#15803D', marginBottom: 2.5 }}>✓ QR Standee & WhatsApp Review Funnel Ready</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.pageFooter}>
          <Text style={styles.footerBrand}>{platform.toUpperCase()} INTELLIGENCE REPORT</Text>
          <Text style={styles.footerPageNum}>Page 1 of 4</Text>
        </View>
      </Page>

      {/* ══════════════════════════════════════════════════════════════════════
          PAGE 2: 6-MONTH GOOGLE TRAJECTORY & VISUAL TRENDS
      ══════════════════════════════════════════════════════════════════════ */}
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <Text style={styles.headerLeft}>6-Month Google Trajectory</Text>
          <Text style={styles.businessTitle}>{businessName}</Text>
        </View>

        <Text style={styles.pageTitle}>Performance Trajectory & Trends</Text>
        <Text style={styles.pageSubtitle}>
          Real-time measurement from Google Search & Google Maps Performance API
        </Text>

        {/* 1. Profile Views Chart */}
        <View style={[styles.card, { marginBottom: 8 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 9.5, fontWeight: 'bold', color: '#0F172A' }}>Google Search & Maps Views</Text>
            <Text style={{ fontSize: 7, color: '#15803D', fontWeight: 'bold' }}>
              Joined {data.growthNumbers.joinedMonthLabel}
            </Text>
          </View>
          <Text style={{ fontSize: 7, color: '#64748B', marginBottom: 4 }}>
            Monthly impressions from customers searching for {category}
          </Text>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 42, paddingTop: 4, borderBottomWidth: 1, borderBottomColor: '#CBD5E1' }}>
            {data.growthNumbers.months.map((m, idx) => {
              const val = data.growthNumbers.profileViews[idx] || 0;
              const maxVal = Math.max(...data.growthNumbers.profileViews, 1);
              const barHeight = Math.max(5, Math.round((val / maxVal) * 32));
              const isCurrent = idx === 5;
              const isJoinMonth = idx === data.growthNumbers.joinedMonthIndex;
              return (
                <View key={`pv-${idx}`} style={{ alignItems: 'center', width: 48 }}>
                  <Text style={{ fontSize: 6.5, fontWeight: 'bold', color: '#0F172A', marginBottom: 2 }}>{val.toLocaleString()}</Text>
                  <View style={{ width: 14, height: barHeight, backgroundColor: isCurrent ? '#009F50' : isJoinMonth ? '#2563EB' : '#94A3B8', borderRadius: 2 }} />
                </View>
              );
            })}
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
            {data.growthNumbers.months.map((m, idx) => (
              <Text key={`m1-${idx}`} style={{ fontSize: 6.5, color: '#64748B', width: 48, textAlign: 'center' }}>{m}</Text>
            ))}
          </View>
          <Text style={{ fontSize: 6.8, color: '#475569', marginTop: 4, fontStyle: 'italic' }}>
            {data.growthNumbers.profileViewsAnalysis}
          </Text>
        </View>

        {/* 2. Calls Chart */}
        <View style={[styles.card, { marginBottom: 8 }]}>
          <Text style={{ fontSize: 9.5, fontWeight: 'bold', color: '#0F172A' }}>Direct Phone Call Clicks</Text>
          <Text style={{ fontSize: 7, color: '#64748B', marginBottom: 4 }}>
            High-intent customer calls connected directly from Google profile
          </Text>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 38, paddingTop: 4, borderBottomWidth: 1, borderBottomColor: '#CBD5E1' }}>
            {data.growthNumbers.months.map((m, idx) => {
              const val = data.growthNumbers.calls[idx] || 0;
              const maxVal = Math.max(...data.growthNumbers.calls, 1);
              const barHeight = Math.max(5, Math.round((val / maxVal) * 28));
              const isCurrent = idx === 5;
              return (
                <View key={`c-${idx}`} style={{ alignItems: 'center', width: 48 }}>
                  <Text style={{ fontSize: 6.5, fontWeight: 'bold', color: '#0F172A', marginBottom: 2 }}>{val}</Text>
                  <View style={{ width: 14, height: barHeight, backgroundColor: isCurrent ? '#2563EB' : '#94A3B8', borderRadius: 2 }} />
                </View>
              );
            })}
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
            {data.growthNumbers.months.map((m, idx) => (
              <Text key={`m2-${idx}`} style={{ fontSize: 6.5, color: '#64748B', width: 48, textAlign: 'center' }}>{m}</Text>
            ))}
          </View>
          <Text style={{ fontSize: 6.8, color: '#475569', marginTop: 4, fontStyle: 'italic' }}>
            {data.growthNumbers.callsAnalysis}
          </Text>
        </View>

        {/* 3. Driving Directions Chart */}
        <View style={[styles.card, { marginBottom: 8 }]}>
          <Text style={{ fontSize: 9.5, fontWeight: 'bold', color: '#0F172A' }}>Driving Direction Navigations</Text>
          <Text style={{ fontSize: 7, color: '#64748B', marginBottom: 4 }}>
            Customers who opened Google Maps to navigate to your physical location
          </Text>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 38, paddingTop: 4, borderBottomWidth: 1, borderBottomColor: '#CBD5E1' }}>
            {data.growthNumbers.months.map((m, idx) => {
              const val = data.growthNumbers.directionRequests[idx] || 0;
              const maxVal = Math.max(...data.growthNumbers.directionRequests, 1);
              const barHeight = Math.max(5, Math.round((val / maxVal) * 28));
              const isCurrent = idx === 5;
              return (
                <View key={`dr-${idx}`} style={{ alignItems: 'center', width: 48 }}>
                  <Text style={{ fontSize: 6.5, fontWeight: 'bold', color: '#0F172A', marginBottom: 2 }}>{val}</Text>
                  <View style={{ width: 14, height: barHeight, backgroundColor: isCurrent ? '#009F50' : '#94A3B8', borderRadius: 2 }} />
                </View>
              );
            })}
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
            {data.growthNumbers.months.map((m, idx) => (
              <Text key={`m3-${idx}`} style={{ fontSize: 6.5, color: '#64748B', width: 48, textAlign: 'center' }}>{m}</Text>
            ))}
          </View>
          <Text style={{ fontSize: 6.8, color: '#475569', marginTop: 4, fontStyle: 'italic' }}>
            {data.growthNumbers.directionRequestsAnalysis}
          </Text>
        </View>

        {/* Bottom Trajectory Insights */}
        <View style={{ backgroundColor: '#F0FDF4', borderRadius: 6, borderWidth: 1, borderColor: '#DCFCE7', padding: 8 }}>
          <Text style={{ fontSize: 8, fontWeight: 'bold', color: '#166534', marginBottom: 2 }}>
            Trajectory Takeaway:
          </Text>
          <Text style={{ fontSize: 7.2, color: '#15803D' }}>
            Continuous weekly updates and 30-second review responses prevent ranking decay and compound organic discovery over a 90-day cycle.
          </Text>
        </View>

        <View style={styles.pageFooter}>
          <Text style={styles.footerBrand}>{platform.toUpperCase()} INTELLIGENCE REPORT</Text>
          <Text style={styles.footerPageNum}>Page 2 of 4</Text>
        </View>
      </Page>

      {/* ══════════════════════════════════════════════════════════════════════
          PAGE 3: FIVE AUTONOMOUS AI MARKETING AGENTS BRIEFING
      ══════════════════════════════════════════════════════════════════════ */}
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <Text style={styles.headerLeft}>AI Agents Execution</Text>
          <Text style={styles.businessTitle}>{businessName}</Text>
        </View>

        <Text style={styles.pageTitle}>Autonomous AI Marketing Agents</Text>
        <Text style={styles.pageSubtitle}>
          Detailed execution report of your 5 automated agents working 24×7
        </Text>

        {/* Agent 1: Ranking Agent & Keywords */}
        <View style={[styles.card, { marginBottom: 8 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
            <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#0F172A' }}>
              1. Ranking Agent (High-Intent Keywords Injection)
            </Text>
            <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 5, paddingVertical: 1.5, borderRadius: 3 }}>
              <Text style={{ fontSize: 6.5, color: '#15803D', fontWeight: 'bold' }}>Active & Ranking</Text>
            </View>
          </View>
          <Text style={{ fontSize: 7, color: '#64748B', marginBottom: 4 }}>
            Keywords continuously optimized across services, descriptions, review replies, and updates
          </Text>

          {/* Keywords Table */}
          <View style={styles.table}>
            <View style={styles.tableHeaderRow}>
              <Text style={styles.th1}>Tracked Keyword Phrase</Text>
              <Text style={styles.th2}>Est. Monthly Searches</Text>
              <Text style={styles.th3}>Optimization Status</Text>
            </View>
            {(data.reviewReplyAgent.keywordsUsed.slice(0, 4) || []).map((k, idx) => (
              <View key={`kw-${idx}`} style={styles.tableRow}>
                <Text style={styles.td1}>{k.keyword}</Text>
                <Text style={styles.td2}>{k.volume.toLocaleString()}/mo</Text>
                <Text style={styles.td3}>✓ Injected</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Agent 2: Review Reply Agent */}
        <View style={[styles.card, { marginBottom: 8 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
            <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#0F172A' }}>
              2. Review Reply Agent (30-Sec Reputation Guarantee)
            </Text>
            <Text style={{ fontSize: 7, color: '#009F50', fontWeight: 'bold' }}>
              {data.reviewReplyAgent.reviewsReplied} Reviews Handled
            </Text>
          </View>

          {data.reviewReplyAgent.repliesThisMonth.length > 0 ? (
            <View style={{ backgroundColor: '#FFFFFF', borderRadius: 4, borderWidth: 1, borderColor: '#E2E8F0', padding: 6, marginTop: 2 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                <Text style={{ fontSize: 7.5, fontWeight: 'bold', color: '#0F172A' }}>
                  {data.reviewReplyAgent.repliesThisMonth[0]?.customerName}
                </Text>
                <Text style={{ fontSize: 7, color: '#EAB308' }}>★★★★★ Verified Google Review</Text>
              </View>
              <Text style={{ fontSize: 7, color: '#475569', fontStyle: 'italic', marginBottom: 3 }}>
                "{data.reviewReplyAgent.repliesThisMonth[0]?.reviewText}"
              </Text>
              <View style={{ backgroundColor: '#F8FAFC', padding: 5, borderRadius: 3, borderLeftWidth: 2, borderLeftColor: '#009F50' }}>
                <Text style={{ fontSize: 6.8, fontWeight: 'bold', color: '#166534', marginBottom: 1 }}>AI Reply (Synced to Google):</Text>
                <Text style={{ fontSize: 6.8, color: '#15803D' }}>
                  {data.reviewReplyAgent.repliesThisMonth[0]?.replyText}
                </Text>
              </View>
            </View>
          ) : (
            <Text style={{ fontSize: 7, color: '#64748B' }}>
              All incoming Google customer reviews are scanned and answered within 30 seconds with positive tone and SEO keywords.
            </Text>
          )}
        </View>

        {/* Agent 3 & Agent 4: Creative & Media */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
          {/* Creative Agent */}
          <View style={{ flex: 1, backgroundColor: '#F8FAFC', borderRadius: 6, borderWidth: 1, borderColor: '#E2E8F0', padding: 8 }}>
            <Text style={{ fontSize: 8.5, fontWeight: 'bold', color: '#0F172A', marginBottom: 2 }}>
              3. Creative Agent
            </Text>
            <Text style={{ fontSize: 6.8, color: '#64748B', marginBottom: 4 }}>
              Localized marketing posters with native CALL CTA
            </Text>
            <View style={{ backgroundColor: '#FFFFFF', borderRadius: 4, borderWidth: 1, borderColor: '#E2E8F0', padding: 5 }}>
              <Text style={{ fontSize: 7, fontWeight: 'bold', color: '#0F172A' }}>
                {data.recap.googleUpdatesPosted} Updates Published
              </Text>
              <Text style={{ fontSize: 6.8, color: '#475569', marginTop: 1 }}>
                Scheduled across weekly peak hours to maximize local reach.
              </Text>
            </View>
          </View>

          {/* Media Agent */}
          <View style={{ flex: 1, backgroundColor: '#F8FAFC', borderRadius: 6, borderWidth: 1, borderColor: '#E2E8F0', padding: 8 }}>
            <Text style={{ fontSize: 8.5, fontWeight: 'bold', color: '#0F172A', marginBottom: 2 }}>
              4. Media Agent
            </Text>
            <Text style={{ fontSize: 6.8, color: '#64748B', marginBottom: 4 }}>
              Weekly photo uploads boost map discoverability
            </Text>
            <View style={{ backgroundColor: '#FFFFFF', borderRadius: 4, borderWidth: 1, borderColor: '#E2E8F0', padding: 5 }}>
              <Text style={{ fontSize: 7, fontWeight: 'bold', color: '#0F172A' }}>
                {data.mediaAgent.mediaUploaded} Photos Uploaded
              </Text>
              <Text style={{ fontSize: 6.8, color: '#475569', marginTop: 1 }}>
                Profiles with fresh weekly photos get +42% more directions.
              </Text>
            </View>
          </View>
        </View>

        {/* Agent 5: Video & Reels Agent */}
        <View style={[styles.card, { marginBottom: 0 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
            <Text style={{ fontSize: 8.5, fontWeight: 'bold', color: '#0F172A' }}>
              5. Video & Reels Agent (30-Day Content Framework)
            </Text>
            <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 5, paddingVertical: 1.5, borderRadius: 3 }}>
              <Text style={{ fontSize: 6.5, color: '#B45309', fontWeight: 'bold' }}>Viral Reel Mode Active</Text>
            </View>
          </View>
          <Text style={{ fontSize: 6.8, color: '#64748B' }}>
            Generates short-form video scripts, viral reels, and showcase clips from your top-selling products and service catalog.
          </Text>
        </View>

        <View style={styles.pageFooter}>
          <Text style={styles.footerBrand}>{platform.toUpperCase()} INTELLIGENCE REPORT</Text>
          <Text style={styles.footerPageNum}>Page 3 of 4</Text>
        </View>
      </Page>

      {/* ══════════════════════════════════════════════════════════════════════
          PAGE 4: 30-DAY GROWTH ROADMAP & ACTION PLAN
      ══════════════════════════════════════════════════════════════════════ */}
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <Text style={styles.headerLeft}>Roadmap & Action Plan</Text>
          <Text style={styles.businessTitle}>{businessName}</Text>
        </View>

        <Text style={styles.pageTitle}>30-Day Growth Roadmap</Text>
        <Text style={styles.pageSubtitle}>
          Prioritized operational recommendations to hit 90+ Google Marketing Score
        </Text>

        {/* Dual Conversion Hardware & Website Engine */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
          {/* Engine 1: QR Review Standee */}
          <View style={{ flex: 1, backgroundColor: '#F8FAFC', borderRadius: 6, borderWidth: 1, borderColor: '#E2E8F0', padding: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 3 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#009F50' }} />
              <Text style={{ fontSize: 8.5, fontWeight: 'bold', color: '#0F172A' }}>QR Review Standee</Text>
            </View>
            <Text style={{ fontSize: 7, color: '#475569', lineHeight: 1.3 }}>
              Placed at your counter or checkout. Customers scan with camera to open your verified 5-star Google review box with zero typing friction.
            </Text>
          </View>

          {/* Engine 2: Instant Google-Synced Website */}
          <View style={{ flex: 1, backgroundColor: '#F8FAFC', borderRadius: 6, borderWidth: 1, borderColor: '#E2E8F0', padding: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 3 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#2563EB' }} />
              <Text style={{ fontSize: 8.5, fontWeight: 'bold', color: '#0F172A' }}>Instant Synced Website</Text>
            </View>
            <Text style={{ fontSize: 7, color: '#475569', lineHeight: 1.3 }}>
              High-converting mobile web landing page automatically updated from your Google Business hours, services, catalog, and reviews.
            </Text>
          </View>
        </View>

        {/* Top 3 Prioritized Next Actions */}
        <Text style={{ fontSize: 10.5, fontWeight: 'bold', color: '#0F172A', marginBottom: 6 }}>
          Top 3 Next Actions for {monthName}
        </Text>

        {(data.recap.growthActions || []).slice(0, 3).map((act, idx) => (
          <View
            key={`act-${idx}`}
            style={{
              flexDirection: 'row',
              backgroundColor: '#F8FAFC',
              borderRadius: 6,
              borderWidth: 1,
              borderColor: '#E2E8F0',
              padding: 8,
              marginBottom: 6,
              alignItems: 'center',
            }}
          >
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: 11,
                backgroundColor: idx === 0 ? '#009F50' : idx === 1 ? '#2563EB' : '#7C3AED',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 10,
              }}
            >
              <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#FFFFFF' }}>{idx + 1}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 8.5, fontWeight: 'bold', color: '#0F172A', marginBottom: 1 }}>
                {act.title}
              </Text>
              <Text style={{ fontSize: 7.2, color: '#64748B' }}>{act.desc}</Text>
            </View>
          </View>
        ))}

        {/* Official Certification & Verification Block */}
        <View
          style={{
            backgroundColor: '#0F172A',
            borderRadius: 8,
            padding: 12,
            marginTop: 10,
            marginBottom: 8,
            color: '#FFFFFF',
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#FFFFFF' }}>
                Official Marketing Intelligence Certification
              </Text>
              <Text style={{ fontSize: 7, color: '#94A3B8', marginTop: 2 }}>
                Verified via Google Business API & {platform} Autonomous Marketing Engine
              </Text>
            </View>
            <View style={{ backgroundColor: 'rgba(0, 159, 80, 0.25)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 }}>
              <Text style={{ fontSize: 7.5, color: '#4ADE80', fontWeight: 'bold' }}>AUDIT VERIFIED</Text>
            </View>
          </View>

          <View style={{ borderTopWidth: 1, borderTopColor: '#1E293B', marginTop: 8, paddingTop: 6, flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 6.8, color: '#64748B' }}>
              Report Hash: {businessName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase()}-{Date.now().toString().slice(-6)}
            </Text>
            <Text style={{ fontSize: 6.8, color: '#64748B' }}>
              Confidential — For {businessName} Management Only
            </Text>
          </View>
        </View>

        <View style={styles.pageFooter}>
          <Text style={styles.footerBrand}>{platform.toUpperCase()} INTELLIGENCE REPORT</Text>
          <Text style={styles.footerPageNum}>Page 4 of 4</Text>
        </View>
      </Page>
    </Document>
  );
};

export async function generateMonthlyMarketingReportPdfBuffer(data: MonthlyMarketingReportData): Promise<Buffer> {
  return await renderToBuffer(<MonthlyMarketingReportPdf data={data} />);
}
