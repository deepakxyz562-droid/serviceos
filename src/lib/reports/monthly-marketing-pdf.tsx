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
  monthName: string; // e.g. "October 2026" or "Nov 26"
  reportTitle?: string; // e.g. "Monthly Marketing Intelligence Report"
  ownerName?: string;
  category?: string; // e.g. "Software Development & IT", "Bakery & Cakes", "Pool & Farmhouse"
  address?: string;
  email?: string;
  phone?: string;
  website?: string;
  marketingScore?: number; // 0 to 100
  marketingScoreStatus?: string; // "Poor" | "Fair" | "Good" | "Excellent"
  connectedStatus?: string; // e.g. "Google Business Profile — Connected & Verified"
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
    months: string[]; // e.g. ["May 2026", "Jun 2026", "Jul 2026", "Aug 2026", "Sep 2026", "Oct 2026"]
    profileViews: number[];
    profileViewsAnalysis: string;
    calls: number[];
    callsAnalysis: string;
    directionRequests: number[];
    directionRequestsAnalysis: string;
    joinedMonthIndex: number; // 0 to 5
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
    paddingTop: 36,
    paddingBottom: 38,
    paddingHorizontal: 40,
    fontSize: 9,
    color: '#0F172A',
  },
  coverPage: {
    fontFamily: 'Helvetica',
    backgroundColor: '#070C18',
    paddingHorizontal: 48,
    paddingVertical: 44,
    color: '#FFFFFF',
    justifyContent: 'space-between',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginBottom: 14,
  },
  headerLeft: {
    fontSize: 8.5,
    color: '#64748B',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  businessTitle: {
    fontSize: 10.5,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  connectedBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
    fontSize: 7.5,
    color: '#15803D',
    fontWeight: 'bold',
  },
  pageFooter: {
    position: 'absolute',
    bottom: 22,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
  },
  footerBrand: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#64748B',
    letterSpacing: 0.6,
  },
  footerPageNum: {
    fontSize: 8,
    color: '#94A3B8',
  },
  pageTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 3,
  },
  pageSubtitle: {
    fontSize: 9,
    color: '#64748B',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 10,
  },
  metricCardRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 9,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 7.5,
    color: '#64748B',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  table: {
    width: '100%',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    marginTop: 6,
    marginBottom: 10,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 5.5,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  th1: { flex: 3.2, fontSize: 7.5, fontWeight: 'bold', color: '#475569' },
  th2: { flex: 2, fontSize: 7.5, fontWeight: 'bold', color: '#475569', textAlign: 'center' },
  th3: { flex: 1.4, fontSize: 7.5, fontWeight: 'bold', color: '#475569', textAlign: 'center' },
  td1: { flex: 3.2, fontSize: 8, color: '#0F172A' },
  td2: { flex: 2, fontSize: 8, color: '#334155', textAlign: 'center' },
  td3: { flex: 1.4, fontSize: 8, color: '#009F50', fontWeight: 'bold', textAlign: 'center' },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 4,
    alignItems: 'center',
  },
  chip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
    fontSize: 7.5,
    color: '#334155',
    fontWeight: 'bold',
  },
  chipsLabel: {
    fontSize: 7.5,
    fontWeight: 'bold',
    color: '#64748B',
    marginRight: 4,
  },
});

export const MonthlyMarketingReportPdf: React.FC<{ data: MonthlyMarketingReportData }> = ({ data }) => {
  const businessName = data.businessName || 'Business Owner';
  const ownerName = data.ownerName || businessName;
  const monthName = data.monthName || 'Current Month';
  const reportTitle = data.reportTitle || `Marketing Intelligence Report — ${monthName}`;
  const address = data.address || 'Verified Google Business Address';
  const category = data.category || 'Local Business';
  const platform = data.platformBrand || 'ServiceOS';
  const contact = [data.email, data.phone, data.website].filter(Boolean).join(' • ');

  const score = data.marketingScore ?? 84;
  const scoreColor = score >= 80 ? '#009F50' : score >= 60 ? '#D97706' : '#DC2626';

  return (
    <Document>
      {/* ── PAGE 1: COVER PAGE (Sleek Dark Executive Theme) ── */}
      <Page size="A4" style={styles.coverPage}>
        <View style={{ paddingTop: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' }} />
            <Text style={{ fontSize: 10, color: '#94A3B8', fontWeight: 'bold', letterSpacing: 1.5, textTransform: 'uppercase' }}>
              {platform} LOCAL MARKETING INTELLIGENCE
            </Text>
          </View>

          <Text style={{ fontSize: 30, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 6 }}>
            {businessName}
          </Text>

          {ownerName !== businessName && (
            <Text style={{ fontSize: 13, color: '#94A3B8', marginBottom: 8 }}>
              Prepared for {ownerName}
            </Text>
          )}

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, marginBottom: 14 }}>
            <View style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', borderWidth: 1, borderColor: '#10B981', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }}>
              <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#10B981' }}>{category}</Text>
            </View>
            <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#38BDF8' }}>
              {reportTitle}
            </Text>
          </View>

          <Text style={{ fontSize: 9.5, color: '#64748B', maxWidth: 440, lineHeight: 1.4 }}>
            Comprehensive performance audit across Google Search, Google Maps, verified keyword rankings, automated review replies, and creative campaign reach.
          </Text>
        </View>

        {/* Center Graphic Box */}
        <View
          style={{
            backgroundColor: '#0F172A',
            borderRadius: 14,
            borderWidth: 1,
            borderColor: '#1E293B',
            padding: 22,
            marginVertical: 32,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <View>
              <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#FFFFFF' }}>
                5 Growth AI Agents Status
              </Text>
              <Text style={{ fontSize: 8.5, color: '#94A3B8', marginTop: 2 }}>
                Autonomous 24×7 Local SEO & Reputation Engine
              </Text>
            </View>
            <View style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 12 }}>
              <Text style={{ fontSize: 8.5, fontWeight: 'bold', color: '#34D399' }}>ALL AGENTS ACTIVE</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {[
              { name: 'Ranking Agent', desc: 'Keyword Injection & Search Map Ranking' },
              { name: 'Review Reply Agent', desc: 'Instant 24×7 Customer Review Responses' },
              { name: 'Media Agent', desc: 'Photo Pipeline & Business Profile Sync' },
              { name: 'Creative Agent', desc: 'Local SEO Posts with Native CALL CTA' },
              { name: 'Video Agent', desc: 'Product Visuals & Video Content Engine' },
            ].map((ag, i) => (
              <View key={`cov-ag-${i}`} style={{ width: '48%', backgroundColor: '#1E293B', borderRadius: 6, padding: 8 }}>
                <Text style={{ fontSize: 8.5, fontWeight: 'bold', color: '#F8FAFC' }}>{ag.name}</Text>
                <Text style={{ fontSize: 7, color: '#94A3B8', marginTop: 2 }}>{ag.desc}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Bottom Cover Footer */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingBottom: 10 }}>
          <View>
            <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#FFFFFF', letterSpacing: 1.5 }}>
              {platform.toUpperCase()}
            </Text>
            <Text style={{ fontSize: 8, color: '#64748B', marginTop: 2 }}>
              AI Business Operating System for Local Enterprises
            </Text>
          </View>
          <Text style={{ fontSize: 8.5, color: '#64748B' }}>Page 1 of 9</Text>
        </View>
      </Page>

      {/* ── PAGE 2: EXECUTIVE OVERVIEW ── */}
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <Text style={styles.headerLeft}>Executive Overview</Text>
          <View style={styles.headerRight}>
            <Text style={styles.businessTitle}>{businessName}</Text>
            <Text style={styles.connectedBadge}>{data.connectedStatus || 'Google Business — Connected'}</Text>
          </View>
        </View>

        <Text style={{ fontSize: 8.5, color: '#475569', marginBottom: 2 }}>{address}</Text>
        {contact ? <Text style={{ fontSize: 8, color: '#64748B', marginBottom: 12 }}>{contact}</Text> : null}

        {/* Marketing Score Card */}
        <View style={[styles.card, { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0', marginBottom: 14 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <View>
              <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#0F172A' }}>Local Marketing Health Score</Text>
              <Text style={{ fontSize: 7.5, color: '#64748B' }}>
                Algorithmic composite of Google visibility, customer reviews, photo freshness & SEO activity
              </Text>
            </View>
            <View style={{ backgroundColor: score >= 75 ? '#DCFCE7' : '#FEF3C7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 }}>
              <Text style={{ fontSize: 9, fontWeight: 'bold', color: scoreColor }}>
                {data.marketingScoreStatus || (score >= 75 ? 'Good' : 'Needs Attention')}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 6 }}>
            <Text style={{ fontSize: 28, fontWeight: 'bold', color: scoreColor }}>
              {score}
            </Text>
            <Text style={{ fontSize: 10, color: '#64748B' }}>/ 100</Text>
          </View>

          {/* Progress track */}
          <View style={{ height: 6, backgroundColor: '#E2E8F0', borderRadius: 3, overflow: 'hidden' }}>
            <View style={{ width: `${Math.min(100, Math.max(5, score))}%`, height: '100%', backgroundColor: scoreColor }} />
          </View>
        </View>

        {/* 5 Growth Focused AI Agents */}
        <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#0F172A', marginBottom: 8 }}>
          Your 5 Growth-Focused AI Agents
        </Text>

        {[
          { name: 'Ranking Agent', tasks: data.agentTasks.ranking, desc: 'Regularly optimizes local keywords & Google Business Profile metadata' },
          { name: 'Review Reply Agent', tasks: data.agentTasks.reviewReply, desc: 'Replies to every Google customer review with SEO-infused responses' },
          { name: 'Media Agent', tasks: data.agentTasks.media, desc: 'Schedules and syncs verified business photos to Google Search & Maps' },
          { name: 'Creative Agent', tasks: data.agentTasks.creative, desc: 'Creates dynamic localized marketing posts with native Call CTAs' },
          { name: 'Video Agent', beta: true, tasks: data.agentTasks.video, desc: 'Creates short-form video content from product & showcase catalog' },
        ].map((agent, i) => (
          <View
            key={`agent-${i}`}
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#F8FAFC',
              borderRadius: 6,
              borderWidth: 1,
              borderColor: '#E2E8F0',
              paddingVertical: 8,
              paddingHorizontal: 12,
              marginBottom: 6,
            }}
          >
            <View style={{ flex: 1, paddingRight: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#0F172A' }}>{agent.name}</Text>
                {agent.beta && (
                  <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 3 }}>
                    <Text style={{ fontSize: 6.5, fontWeight: 'bold', color: '#92400E' }}>BETA</Text>
                  </View>
                )}
              </View>
              <Text style={{ fontSize: 7.5, color: '#64748B', marginTop: 1.5 }}>{agent.desc}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#009F50' }}>{agent.tasks}</Text>
              <Text style={{ fontSize: 7, color: '#64748B' }}>Tasks Completed</Text>
            </View>
          </View>
        ))}

        <Text style={{ fontSize: 8, color: '#94A3B8', marginTop: 6, textAlign: 'center' }}>
          Detailed performance breakdown for each agent on the following pages
        </Text>

        <View style={styles.pageFooter}>
          <Text style={styles.footerBrand}>{platform.toUpperCase()} INTELLIGENCE</Text>
          <Text style={styles.footerPageNum}>Page 2 of 9</Text>
        </View>
      </Page>

      {/* ── PAGE 3: AGENT 1 - RANKING AGENT ── */}
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <Text style={styles.headerLeft}>Agent 01 • Ranking Engine</Text>
          <Text style={styles.businessTitle}>{businessName}</Text>
        </View>

        <Text style={styles.pageTitle}>Ranking Agent</Text>
        <Text style={styles.pageSubtitle}>
          Regularly analyzes local search keywords and injects them into business updates to boost Google Maps ranking
        </Text>

        <View style={[styles.card, { padding: 20, alignItems: 'center', marginTop: 30 }]}>
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
            <Text style={{ fontSize: 18 }}>🎯</Text>
          </View>
          <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#0F172A', marginBottom: 4 }}>
            Local SEO Strategy Active
          </Text>
          <Text style={{ fontSize: 8.5, color: '#64748B', textAlign: 'center', maxWidth: 380, lineHeight: 1.4 }}>
            Your Ranking Agent connects high-intent search terms (e.g. &quot;{category}&quot; in your neighborhood) with your Google Business Profile. Every review reply and scheduled post strengthens your local Google Maps positioning against competitors.
          </Text>
        </View>

        <View style={[styles.card, { padding: 12, marginTop: 10 }]}>
          <Text style={{ fontSize: 9.5, fontWeight: 'bold', color: '#0F172A', marginBottom: 4 }}>
            Top Local Ranking Factors Monitored
          </Text>
          <View style={{ gap: 4 }}>
            {[
              'Relevance: Dynamic category keywords mapped to user search intent',
              'Prominence: Consistent weekly posts and rapid Google review replies',
              'Distance & Geo-signals: Explicit locality tags (sub-neighborhoods & nearby landmarks)',
            ].map((f, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                <Text style={{ fontSize: 9, color: '#009F50', fontWeight: 'bold' }}>✓</Text>
                <Text style={{ fontSize: 8, color: '#475569' }}>{f}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.pageFooter}>
          <Text style={styles.footerBrand}>{platform.toUpperCase()} INTELLIGENCE</Text>
          <Text style={styles.footerPageNum}>Page 3 of 9</Text>
        </View>
      </Page>

      {/* ── PAGE 4: AGENT 2 - REVIEW REPLY AGENT ── */}
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <Text style={styles.headerLeft}>Agent 02 • Customer Trust</Text>
          <Text style={styles.businessTitle}>{businessName}</Text>
        </View>

        <Text style={styles.pageTitle}>Review Reply Agent</Text>
        <Text style={styles.pageSubtitle}>
          Professionally replies to every customer review with SEO-infused, personalized messages
        </Text>

        {/* 4 Top Metric Cards */}
        <View style={styles.metricCardRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{String(data.reviewReplyAgent.reviewsChecked).padStart(2, '0')}</Text>
            <Text style={styles.metricLabel}>Reviews Checked</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={[styles.metricValue, { color: '#009F50' }]}>{String(data.reviewReplyAgent.reviewsReplied).padStart(2, '0')}</Text>
            <Text style={styles.metricLabel}>Reviews Replied</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{String(data.reviewReplyAgent.keywordsUsedCount).padStart(2, '0')}</Text>
            <Text style={styles.metricLabel}>Keywords Injected</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{String(data.reviewReplyAgent.lifetimeReplies).padStart(2, '0')}</Text>
            <Text style={styles.metricLabel}>Lifetime Replies</Text>
          </View>
        </View>

        {/* Reviews Replied This Month */}
        <Text style={{ fontSize: 10.5, fontWeight: 'bold', color: '#0F172A', marginBottom: 6 }}>
          Recent Google Review Replies
        </Text>

        {data.reviewReplyAgent.repliesThisMonth.length > 0 ? (
          data.reviewReplyAgent.repliesThisMonth.slice(0, 3).map((item, idx) => (
            <View key={`reply-${idx}`} style={[styles.card, { padding: 8, marginBottom: 6 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#0F172A' }}>{item.customerName}</Text>
                {item.rating && (
                  <Text style={{ fontSize: 8, color: '#F59E0B', fontWeight: 'bold' }}>
                    {'★'.repeat(item.rating)}
                  </Text>
                )}
              </View>
              <Text style={{ fontSize: 7.5, color: '#475569', fontStyle: 'italic', marginVertical: 2 }}>
                &quot;{item.reviewText}&quot;
              </Text>
              <Text style={{ fontSize: 7.5, color: '#009F50', fontWeight: 'bold', marginTop: 1.5 }}>
                AI Assistant Reply:
              </Text>
              <Text style={{ fontSize: 7.5, color: '#334155', lineHeight: 1.3 }}>{item.replyText}</Text>
            </View>
          ))
        ) : (
          <View style={[styles.card, { padding: 12, alignItems: 'center' }]}>
            <Text style={{ fontSize: 8.5, fontWeight: 'bold', color: '#0F172A' }}>
              All Customer Reviews Addressed
            </Text>
            <Text style={{ fontSize: 7.5, color: '#64748B', marginTop: 2 }}>
              Your Review Reply Agent is on standby 24×7 to reply as soon as new Google reviews arrive.
            </Text>
          </View>
        )}

        {/* Keywords Used in Replies Table */}
        <Text style={{ fontSize: 10.5, fontWeight: 'bold', color: '#0F172A', marginTop: 4, marginBottom: 4 }}>
          Keywords Used in Review Replies
        </Text>

        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={styles.th1}>High-Intent Keyword</Text>
            <Text style={styles.th2}>Est. Monthly Search Volume</Text>
            <Text style={styles.th3}>Times Used</Text>
          </View>
          {data.reviewReplyAgent.keywordsUsed.map((row, idx) => (
            <View key={`kw-${idx}`} style={styles.tableRow}>
              <Text style={styles.td1}>{row.keyword}</Text>
              <Text style={styles.td2}>{row.volume.toLocaleString()}</Text>
              <Text style={styles.td3}>{String(row.usedCount).padStart(2, '0')}</Text>
            </View>
          ))}
        </View>

        {/* Benefits Chips */}
        <View style={styles.chipsRow}>
          <Text style={styles.chipsLabel}>IMPACT</Text>
          <Text style={styles.chip}>Customer Trust</Text>
          <Text style={styles.chip}>5-Star Conversion</Text>
          <Text style={styles.chip}>Higher Reach</Text>
          <Text style={styles.chip}>SEO Boost</Text>
        </View>

        <View style={styles.pageFooter}>
          <Text style={styles.footerBrand}>{platform.toUpperCase()} INTELLIGENCE</Text>
          <Text style={styles.footerPageNum}>Page 4 of 9</Text>
        </View>
      </Page>

      {/* ── PAGE 5: AGENT 3 - MEDIA AGENT ── */}
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <Text style={styles.headerLeft}>Agent 03 • Visual Presence</Text>
          <Text style={styles.businessTitle}>{businessName}</Text>
        </View>

        <Text style={styles.pageTitle}>Media Agent</Text>
        <Text style={styles.pageSubtitle}>
          Diligently schedules and uploads business photos to increase visibility and click-through rates
        </Text>

        <View style={styles.metricCardRow}>
          <View style={styles.metricCard}>
            <Text style={[styles.metricValue, { color: '#009F50' }]}>
              {String(data.mediaAgent.mediaUploaded).padStart(2, '0')}
            </Text>
            <Text style={styles.metricLabel}>Uploaded This Month</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>
              {String(data.mediaAgent.lifetimeMedia).padStart(2, '0')}
            </Text>
            <Text style={styles.metricLabel}>Total Photos on Google</Text>
          </View>
        </View>

        <View style={[styles.card, { padding: 18, marginTop: 12 }]}>
          <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#0F172A', marginBottom: 4 }}>
            Recommended Photo Topics to Boost Views
          </Text>
          <Text style={{ fontSize: 8, color: '#64748B', marginBottom: 10 }}>
            Google prioritizes profiles that upload fresh real-world photography weekly. Tap &quot;Media Studio&quot; in your mobile app to add:
          </Text>

          <View style={{ gap: 6 }}>
            {data.mediaAgent.recommendedNextUploads.map((rec, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                <Text style={{ fontSize: 9, color: '#2563EB', fontWeight: 'bold' }}>📷</Text>
                <Text style={{ fontSize: 8.5, color: '#334155' }}>{rec}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.pageFooter}>
          <Text style={styles.footerBrand}>{platform.toUpperCase()} INTELLIGENCE</Text>
          <Text style={styles.footerPageNum}>Page 5 of 9</Text>
        </View>
      </Page>

      {/* ── PAGE 6: AGENT 4 - CREATIVE AGENT ── */}
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <Text style={styles.headerLeft}>Agent 04 • Content Publishing</Text>
          <Text style={styles.businessTitle}>{businessName}</Text>
        </View>

        <Text style={styles.pageTitle}>Creative Agent</Text>
        <Text style={styles.pageSubtitle}>
          Creates and schedules local marketing posts with structured benefits checkmarks and direct CALL buttons
        </Text>

        <View style={styles.metricCardRow}>
          <View style={styles.metricCard}>
            <Text style={[styles.metricValue, { color: '#009F50' }]}>{String(data.creativeAgent.creativesPosted).padStart(2, '0')}</Text>
            <Text style={styles.metricLabel}>Creatives Posted</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{String(data.creativeAgent.scheduled).padStart(2, '0')}</Text>
            <Text style={styles.metricLabel}>Scheduled</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{String(data.creativeAgent.keywordsUsedCount).padStart(2, '0')}</Text>
            <Text style={styles.metricLabel}>Keywords Targeted</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{String(data.creativeAgent.lifetimeGenerated).padStart(2, '0')}</Text>
            <Text style={styles.metricLabel}>Lifetime Posts</Text>
          </View>
        </View>

        <Text style={{ fontSize: 10.5, fontWeight: 'bold', color: '#0F172A', marginBottom: 6 }}>
          Latest Published Creative
        </Text>

        <View style={[styles.card, { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10 }]}>
          <View style={{ width: 56, height: 56, backgroundColor: '#E2E8F0', borderRadius: 6, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 18 }}>📰</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 9.5, fontWeight: 'bold', color: '#0F172A' }}>
              {data.creativeAgent.creatives[0]?.title || `Top Rated ${category} Showcase`}
            </Text>
            <Text style={{ fontSize: 7.5, color: '#64748B', marginTop: 2 }}>
              Published {data.creativeAgent.creatives[0]?.postedDate || 'Active this month'}
            </Text>
          </View>
        </View>

        {/* Keywords Used in Posts */}
        <Text style={{ fontSize: 10.5, fontWeight: 'bold', color: '#0F172A', marginTop: 6, marginBottom: 4 }}>
          Keywords Used in Creative Campaigns
        </Text>

        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={styles.th1}>Target Local Keyword</Text>
            <Text style={styles.th2}>Est. Monthly Search Volume</Text>
            <Text style={styles.th3}>Posts Active</Text>
          </View>
          {data.creativeAgent.keywordsUsed.map((row, idx) => (
            <View key={`ckw-${idx}`} style={styles.tableRow}>
              <Text style={styles.td1}>{row.keyword}</Text>
              <Text style={styles.td2}>{row.volume.toLocaleString()}</Text>
              <Text style={styles.td3}>{String(row.usedCount).padStart(2, '0')}</Text>
            </View>
          ))}
        </View>

        <View style={styles.chipsRow}>
          <Text style={styles.chipsLabel}>ADVANTAGES</Text>
          <Text style={styles.chip}>Top Search Visibility</Text>
          <Text style={styles.chip}>Direct Call Clicks</Text>
          <Text style={styles.chip}>Brand Recall</Text>
          <Text style={styles.chip}>Local Authority</Text>
        </View>

        <View style={styles.pageFooter}>
          <Text style={styles.footerBrand}>{platform.toUpperCase()} INTELLIGENCE</Text>
          <Text style={styles.footerPageNum}>Page 6 of 9</Text>
        </View>
      </Page>

      {/* ── PAGE 7: AGENT 5 - VIDEO AGENT ── */}
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <Text style={styles.headerLeft}>Agent 05 • Short-Form Video</Text>
          <Text style={styles.businessTitle}>{businessName}</Text>
        </View>

        <Text style={styles.pageTitle}>Video Agent (Beta)</Text>
        <Text style={styles.pageSubtitle}>
          Transforms showcase photos and promotional offers into engaging short-form video reels
        </Text>

        <View style={[styles.card, { padding: 24, alignItems: 'center', marginTop: 30 }]}>
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
            <Text style={{ fontSize: 18 }}>🎬</Text>
          </View>
          <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#92400E', marginBottom: 4 }}>
            Video Engine Ready for Product Showcase
          </Text>
          <Text style={{ fontSize: 8.5, color: '#64748B', textAlign: 'center', maxWidth: 360, lineHeight: 1.4 }}>
            Upload 3 or more photos of your signature items or workplace. The Video Agent automatically synthesizes smooth zoom transitions, text overlays, and call-to-actions.
          </Text>
        </View>

        <View style={styles.pageFooter}>
          <Text style={styles.footerBrand}>{platform.toUpperCase()} INTELLIGENCE</Text>
          <Text style={styles.footerPageNum}>Page 7 of 9</Text>
        </View>
      </Page>

      {/* ── PAGE 8: GROWTH NUMBERS (6 MONTH REAL TRAJECTORY) ── */}
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <Text style={styles.headerLeft}>Performance Trajectory</Text>
          <Text style={styles.businessTitle}>{businessName}</Text>
        </View>

        <Text style={styles.pageTitle}>6-Month Growth Trajectory</Text>
        <Text style={styles.pageSubtitle}>
          Tracking how your local visibility turns into customer calls, directions, and website visits
        </Text>

        {/* 1. Profile Views Chart */}
        <View style={[styles.card, { marginBottom: 10 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 10.5, fontWeight: 'bold', color: '#0F172A' }}>Profile Views</Text>
            <Text style={{ fontSize: 7, color: '#15803D', fontWeight: 'bold' }}>
              Joined {data.growthNumbers.joinedMonthLabel}
            </Text>
          </View>
          <Text style={{ fontSize: 7.5, color: '#64748B', marginBottom: 6 }}>
            People who found {businessName} on Google Search & Google Maps
          </Text>
          {/* Chart Bars */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 40, paddingTop: 4, borderBottomWidth: 1, borderBottomColor: '#CBD5E1' }}>
            {data.growthNumbers.months.map((m, idx) => {
              const val = data.growthNumbers.profileViews[idx] || 0;
              const maxVal = Math.max(...data.growthNumbers.profileViews, 1);
              const barHeight = Math.max(6, Math.round((val / maxVal) * 30));
              const isCurrent = idx === 5;
              const isJoinMonth = idx === data.growthNumbers.joinedMonthIndex;
              return (
                <View key={`pv-${idx}`} style={{ alignItems: 'center', width: 44 }}>
                  <Text style={{ fontSize: 7, fontWeight: 'bold', color: '#0F172A', marginBottom: 2 }}>{val}</Text>
                  <View style={{ width: 14, height: barHeight, backgroundColor: isCurrent ? '#009F50' : isJoinMonth ? '#2563EB' : '#94A3B8', borderRadius: 2 }} />
                </View>
              );
            })}
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 3 }}>
            {data.growthNumbers.months.map((m, idx) => (
              <Text key={`m1-${idx}`} style={{ fontSize: 6.5, color: '#64748B', width: 44, textAlign: 'center' }}>{m}</Text>
            ))}
          </View>
          <Text style={{ fontSize: 7, color: '#475569', marginTop: 4, fontStyle: 'italic' }}>
            {data.growthNumbers.profileViewsAnalysis}
          </Text>
        </View>

        {/* 2. Calls Chart */}
        <View style={[styles.card, { marginBottom: 10 }]}>
          <Text style={{ fontSize: 10.5, fontWeight: 'bold', color: '#0F172A' }}>Inbound Calls</Text>
          <Text style={{ fontSize: 7.5, color: '#64748B', marginBottom: 6 }}>
            Customers calling {businessName} directly from Google Search & Maps
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 32, paddingTop: 4, borderBottomWidth: 1, borderBottomColor: '#CBD5E1' }}>
            {data.growthNumbers.months.map((m, idx) => {
              const val = data.growthNumbers.calls[idx] || 0;
              const maxVal = Math.max(...data.growthNumbers.calls, 1);
              const barHeight = Math.max(5, Math.round((val / maxVal) * 24));
              return (
                <View key={`c-${idx}`} style={{ alignItems: 'center', width: 44 }}>
                  <Text style={{ fontSize: 7, fontWeight: 'bold', color: '#0F172A', marginBottom: 2 }}>{val}</Text>
                  <View style={{ width: 14, height: barHeight, backgroundColor: '#2563EB', borderRadius: 2 }} />
                </View>
              );
            })}
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 3 }}>
            {data.growthNumbers.months.map((m, idx) => (
              <Text key={`m2-${idx}`} style={{ fontSize: 6.5, color: '#64748B', width: 44, textAlign: 'center' }}>{m}</Text>
            ))}
          </View>
          <Text style={{ fontSize: 7, color: '#475569', marginTop: 4, fontStyle: 'italic' }}>
            {data.growthNumbers.callsAnalysis}
          </Text>
        </View>

        {/* 3. Direction Requests Chart */}
        <View style={[styles.card, { marginBottom: 8 }]}>
          <Text style={{ fontSize: 10.5, fontWeight: 'bold', color: '#0F172A' }}>Direction Requests</Text>
          <Text style={{ fontSize: 7.5, color: '#64748B', marginBottom: 6 }}>
            People asking Google Maps to navigate to {businessName}
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 40, paddingTop: 4, borderBottomWidth: 1, borderBottomColor: '#CBD5E1' }}>
            {data.growthNumbers.months.map((m, idx) => {
              const val = data.growthNumbers.directionRequests[idx] || 0;
              const maxVal = Math.max(...data.growthNumbers.directionRequests, 1);
              const barHeight = Math.max(6, Math.round((val / maxVal) * 30));
              return (
                <View key={`dr-${idx}`} style={{ alignItems: 'center', width: 44 }}>
                  <Text style={{ fontSize: 7, fontWeight: 'bold', color: '#0F172A', marginBottom: 2 }}>{val}</Text>
                  <View style={{ width: 14, height: barHeight, backgroundColor: idx === 5 ? '#009F50' : '#94A3B8', borderRadius: 2 }} />
                </View>
              );
            })}
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 3 }}>
            {data.growthNumbers.months.map((m, idx) => (
              <Text key={`m3-${idx}`} style={{ fontSize: 6.5, color: '#64748B', width: 44, textAlign: 'center' }}>{m}</Text>
            ))}
          </View>
          <Text style={{ fontSize: 7, color: '#475569', marginTop: 4, fontStyle: 'italic' }}>
            {data.growthNumbers.directionRequestsAnalysis}
          </Text>
        </View>

        <View style={styles.pageFooter}>
          <Text style={styles.footerBrand}>{platform.toUpperCase()} INTELLIGENCE</Text>
          <Text style={styles.footerPageNum}>Page 8 of 9</Text>
        </View>
      </Page>

      {/* ── PAGE 9: QUICK RECAP & NEXT ACTIONS ── */}
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <Text style={styles.headerLeft}>Monthly Summary</Text>
          <Text style={styles.businessTitle}>{businessName}</Text>
        </View>

        <Text style={styles.pageTitle}>Monthly Executive Recap</Text>
        <Text style={styles.pageSubtitle}>
          Complete overview of tasks completed by your AI Agents and high-priority action items for next month
        </Text>

        {/* 7 KPI Badges Grid */}
        <View style={[styles.card, { padding: 8, marginBottom: 8 }]}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {[
              { val: data.recap.googleUpdatesPosted, lbl: 'Updates Posted' },
              { val: data.recap.reviewReplied, lbl: 'Reviews Replied' },
              { val: data.recap.mediaUploaded, lbl: 'Photos Uploaded' },
              { val: data.recap.creativeGenerated, lbl: 'Creatives Generated' },
              { val: data.recap.creativePosted, lbl: 'Creatives Published' },
              { val: data.recap.videoGenerated, lbl: 'Videos Created' },
              { val: data.recap.videoPosted, lbl: 'Videos Published' },
            ].map((kpi, idx) => (
              <View
                key={`kpi-${idx}`}
                style={{
                  width: '23%',
                  backgroundColor: '#FFFFFF',
                  borderRadius: 6,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  paddingVertical: 5,
                  paddingHorizontal: 4,
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#0F172A' }}>
                  {String(kpi.val).padStart(2, '0')}
                </Text>
                <Text style={{ fontSize: 6.5, color: '#64748B', textAlign: 'center', marginTop: 1.5 }}>
                  {kpi.lbl}
                </Text>
              </View>
            ))}
          </View>
          <Text style={{ fontSize: 7.5, color: '#009F50', fontWeight: 'bold', marginTop: 6, textAlign: 'center' }}>
            {data.recap.summaryResult}
          </Text>
        </View>

        {/* What You Should Do Now */}
        <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#0F172A', marginBottom: 5 }}>
          Recommended Actions to Accelerate Growth
        </Text>

        {data.recap.growthActions.map((act) => (
          <View key={act.num} style={{ flexDirection: 'row', gap: 7, alignItems: 'flex-start', marginBottom: 5 }}>
            <View style={{ width: 15, height: 15, borderRadius: 7.5, backgroundColor: '#009F50', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 8, color: '#FFFFFF', fontWeight: 'bold' }}>{act.num}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 8, fontWeight: 'bold', color: '#0F172A' }}>{act.title}</Text>
              <Text style={{ fontSize: 7, color: '#64748B' }}>{act.desc}</Text>
            </View>
          </View>
        ))}

        {/* 5 AI Agents Banner */}
        <View style={{ backgroundColor: '#F0FDF4', borderRadius: 6, borderWidth: 1, borderColor: '#DCFCE7', padding: 7, marginTop: 6, marginBottom: 6 }}>
          <Text style={{ fontSize: 8, fontWeight: 'bold', color: '#166534', marginBottom: 3 }}>
            Your 5 AI Growth Agents Work 24×7 in the Background
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
            {['Ranking Agent', 'Review Reply Agent', 'Creative Agent', 'Media Agent', 'Video Agent'].map((a) => (
              <View key={a} style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 5, paddingVertical: 1.5, borderRadius: 3 }}>
                <Text style={{ fontSize: 6.5, fontWeight: 'bold', color: '#15803D' }}>{a} (Active)</Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={{ fontSize: 7, color: '#94A3B8', textAlign: 'center' }}>
          This report is automatically dispatched on the 1st of every month
        </Text>

        <View style={{ marginTop: 8, borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ fontSize: 7, color: '#64748B' }}>Generated by {platform} SEO & Reputation Intelligence</Text>
            <Text style={{ fontSize: 8, fontWeight: 'bold', color: '#0F172A' }}>Keep Growing Your Business with {platform}</Text>
          </View>
          <Text style={{ fontSize: 7.5, color: '#94A3B8' }}>Page 9 of 9</Text>
        </View>
      </Page>
    </Document>
  );
};

export async function generateMonthlyMarketingReportPdfBuffer(data: MonthlyMarketingReportData): Promise<Buffer> {
  return await renderToBuffer(<MonthlyMarketingReportPdf data={data} />);
}
