import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Card, Empty, ErrorNotice, Loading, Screen, colors, ui } from '../src/components/ui';
import { useResource } from '../src/hooks/use-resource';
import { apiRequest } from '../src/lib/api';

type SeoAuditResponse = {
  snapshot?: any;
  tasks?: any[];
  presence?: {
    mode: 'no_website' | 'bgos_hosted' | 'custom_domain';
    canonicalUrl: string | null;
    hostedCanonicalUrl: string;
    domain: string | null;
  };
  gbpScore?: number | null;
};

type RankingsResponse = {
  configured?: boolean;
  presence?: {
    mode: 'no_website' | 'bgos_hosted' | 'custom_domain';
    hostedCanonicalUrl: string;
    canonicalUrl: string | null;
    domain: string | null;
  };
  autoDefaults?: {
    placeId: string | null;
    centerLat: number | null;
    centerLng: number | null;
    suggestedKeywords: string[];
  };
  gridScans?: Array<{
    id: string;
    date: string;
    keyword: string;
    gridSize: 3 | 5;
    radiusKm: number;
    avgRank: number | null;
    top3Pct: number;
    points: Array<{ row: number; col: number; rank: number | null }>;
  }>;
  organicScans?: Array<{
    id: string;
    keyword: string;
    organicRank: number | null;
    aiOverviewPresent: boolean;
    aiOverviewCited: boolean;
    citedDomains: string[];
  }>;
};

type AiGapResponse = {
  report?: {
    scannedAt: string;
    disclaimer: string;
    engineSummaries: Array<{
      platform: string;
      label: string;
      status: string;
      mentionsCount: number;
      citationsCount: number;
      promptsCount: number;
      visibilityRate: number | null;
      note?: string;
    }>;
    competitors: Array<{
      id: string;
      name: string;
      rating: number | null;
      reviewCount: number | null;
      websiteUrl: string | null;
      seoScore: number | null;
      hasSchema: boolean;
      allowsAiBots: boolean | null;
      aiMentionCount: number;
    }>;
    contributingFactors: Array<{
      id: string;
      severity: string;
      title: string;
      explanation: string;
      recommendedAction: string;
      autoFixable: boolean;
      fixActionKey?: string;
    }>;
    planCreatedCount?: number;
  } | null;
};

function gridTileColors(rank: number | null): { bg: string; fg: string } {
  if (rank === null) return { bg: '#F1F5F9', fg: '#64748B' };
  if (rank <= 3) return { bg: '#009F50', fg: '#FFFFFF' };
  if (rank <= 10) return { bg: '#F59E0B', fg: '#FFFFFF' };
  return { bg: '#EF4444', fg: '#FFFFFF' };
}

export default function SeoGrowthScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const initialTab = params.tab === 'grid' || params.tab === 'gap' ? params.tab : 'audit';
  const [tab, setTab] = useState<'audit' | 'grid' | 'gap'>(initialTab);

  const auditRes = useResource<SeoAuditResponse>('/api/seo/audit');
  const rankingsRes = useResource<RankingsResponse>('/api/gbp/rankings');
  const aiGapRes = useResource<AiGapResponse>('/api/seo/ai-competitor-gap');

  const [auditing, setAuditing] = useState(false);
  const [fixingKey, setFixingKey] = useState<string | null>(null);
  const [gridKeyword, setGridKeyword] = useState('');
  const [gridSize, setGridSize] = useState<3 | 5>(3);
  const [radiusKm, setRadiusKm] = useState<number>(3);
  const [scanningGrid, setScanningGrid] = useState(false);
  const [scanningOrganic, setScanningOrganic] = useState(false);
  const [scanningGap, setScanningGap] = useState(false);

  useEffect(() => {
    if (!gridKeyword && rankingsRes.data?.autoDefaults?.suggestedKeywords?.length) {
      setGridKeyword(rankingsRes.data.autoDefaults.suggestedKeywords[0]);
    }
  }, [gridKeyword, rankingsRes.data?.autoDefaults?.suggestedKeywords]);

  const report = auditRes.data?.snapshot;
  const presence = report?.presence || auditRes.data?.presence;
  const tasks = auditRes.data?.tasks || report?.tasks || [];

  async function runAudit() {
    setAuditing(true);
    try {
      await apiRequest('/api/seo/audit', { method: 'POST' });
      await auditRes.refresh();
    } catch (e) {
      Alert.alert('Audit Failed', (e as Error).message || 'Could not complete SEO audit');
    } finally {
      setAuditing(false);
    }
  }

  async function applyFix(actionKey: 'activate_hosted_site' | 'hosted_seo_enrich', taskId?: string) {
    setFixingKey(taskId || actionKey);
    try {
      const res = await apiRequest<{ result?: { message?: string } }>('/api/seo/fixes', {
        method: 'POST',
        body: { action: 'apply', actionKey, taskId, syncToGoogle: true },
      });
      Alert.alert('SEO Applied', res?.result?.message || 'Updated successfully');
      await Promise.all([auditRes.refresh(), rankingsRes.refresh()]);
    } catch (e) {
      Alert.alert('Fix Failed', (e as Error).message || 'Could not apply SEO fix');
    } finally {
      setFixingKey(null);
    }
  }

  async function runRollback(taskId: string) {
    setFixingKey(taskId);
    try {
      const res = await apiRequest<{ message?: string }>('/api/seo/fixes', {
        method: 'POST',
        body: { action: 'rollback', taskId },
      });
      Alert.alert('Rolled Back', res?.message || 'Previous settings restored');
      await auditRes.refresh();
    } catch (e) {
      Alert.alert('Rollback Failed', (e as Error).message || 'Could not roll back');
    } finally {
      setFixingKey(null);
    }
  }

  async function runGridScan() {
    if (!gridKeyword.trim()) {
      Alert.alert('Keyword Required', 'Enter a keyword first.');
      return;
    }
    setScanningGrid(true);
    try {
      await apiRequest('/api/gbp/rankings', {
        method: 'POST',
        body: {
          mode: 'maps_grid',
          keyword: gridKeyword.trim(),
          placeId: rankingsRes.data?.autoDefaults?.placeId,
          centerLat: rankingsRes.data?.autoDefaults?.centerLat,
          centerLng: rankingsRes.data?.autoDefaults?.centerLng,
          gridSize,
          radiusKm,
        },
      });
      await rankingsRes.refresh();
    } catch (e) {
      Alert.alert('Geo-Grid Scan', (e as Error).message || 'Could not scan geo-grid');
    } finally {
      setScanningGrid(false);
    }
  }

  async function runOrganicCheck() {
    if (!gridKeyword.trim()) {
      Alert.alert('Keyword Required', 'Enter a keyword first.');
      return;
    }
    setScanningOrganic(true);
    try {
      await apiRequest('/api/gbp/rankings', {
        method: 'POST',
        body: { mode: 'organic_serp', keywords: [gridKeyword.trim()] },
      });
      await rankingsRes.refresh();
    } catch (e) {
      Alert.alert('Web Rank Check', (e as Error).message || 'Could not check web SERP');
    } finally {
      setScanningOrganic(false);
    }
  }

  async function runAiGap(createPlan = false) {
    setScanningGap(true);
    try {
      const res = await apiRequest<AiGapResponse>('/api/seo/ai-competitor-gap', {
        method: 'POST',
        body: { createPlan },
      });
      aiGapRes.setData(res);
      if (createPlan) {
        Alert.alert(
          'Improvement Plan Created',
          `Added ${res.report?.planCreatedCount || 0} tasks to your Website & AI SEO fix queue.`,
        );
        await auditRes.refresh();
      }
    } catch (e) {
      Alert.alert('AI Visibility Scan', (e as Error).message || 'Could not complete scan');
    } finally {
      setScanningGap(false);
    }
  }

  const latestGrid = useMemo(() => rankingsRes.data?.gridScans?.[0] || null, [rankingsRes.data?.gridScans]);
  const gapReport = aiGapRes.data?.report || null;

  return (
    <Screen
      title="AI Search & SEO"
      subtitle="Website audit, Maps Geo-Grid & ChatGPT/Gemini visibility"
      showBack={true}
      onBack={() => {
        if (router.canGoBack?.()) router.back();
        else router.replace('/(tabs)/index');
      }}
      onRefresh={() => Promise.all([auditRes.refresh(), rankingsRes.refresh(), aiGapRes.refresh()])}
    >
      {/* Tab switcher */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {[
          { id: 'audit' as const, label: 'SEO Audit' },
          { id: 'grid' as const, label: 'Geo-Grid & SERP' },
          { id: 'gap' as const, label: 'AI Visibility' },
        ].map((item) => {
          const active = tab === item.id;
          return (
            <Pressable
              key={item.id}
              onPress={() => setTab(item.id)}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 12,
                backgroundColor: active ? colors.brand : colors.surface,
                borderWidth: 1,
                borderColor: active ? colors.brand : colors.line,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '800', color: active ? '#FFFFFF' : colors.ink }}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {tab === 'audit' && (
        <View style={{ gap: 12 }}>
          <ErrorNotice message={auditRes.error} retry={auditRes.refresh} />

          <Card style={{ gap: 10 }}>
            <View style={[ui.row, { justifyContent: 'space-between' }]}>
              <Text style={ui.heading}>Website Presence &amp; AI Readiness</Text>
              <View style={{ backgroundColor: colors.soft, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                <Text style={{ fontSize: 10.5, fontWeight: '800', color: colors.brandDark }}>
                  {presence?.mode === 'custom_domain'
                    ? 'Custom Domain'
                    : presence?.mode === 'bgos_hosted'
                      ? `Hosted${report?.hostedProfileTier ? ` · Tier ${report.hostedProfileTier}` : ''}`
                      : 'No Website Yet'}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[
                { label: 'Overall', val: report?.overallScore },
                { label: 'GBP', val: report?.gbpScore ?? auditRes.data?.gbpScore },
                { label: 'Website', val: report?.websiteScore },
                { label: 'AI Ready', val: report?.aiReadinessScore },
              ].map((m) => (
                <View
                  key={m.label}
                  style={{
                    flex: 1,
                    backgroundColor: colors.background,
                    borderRadius: 10,
                    padding: 10,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: colors.line,
                  }}
                >
                  <Text style={{ fontSize: 16, fontWeight: '900', color: colors.ink }}>
                    {m.val != null ? `${m.val}` : '—'}
                  </Text>
                  <Text style={{ fontSize: 10, color: colors.muted }}>{m.label}</Text>
                </View>
              ))}
            </View>

            {presence?.mode === 'no_website' ? (
              <Pressable
                disabled={Boolean(fixingKey)}
                onPress={() => void applyFix('activate_hosted_site')}
                style={{
                  backgroundColor: colors.brand,
                  paddingVertical: 12,
                  borderRadius: 12,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                {fixingKey === 'activate_hosted_site' ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <MaterialIcons name="auto-awesome" size={16} color="#FFFFFF" />
                )}
                <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>
                  Activate Free SEO Mini-Site (1-Click)
                </Text>
              </Pressable>
            ) : null}

            <Pressable
              disabled={auditing}
              onPress={() => void runAudit()}
              style={{
                backgroundColor: colors.ink,
                paddingVertical: 12,
                borderRadius: 12,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              {auditing ? <ActivityIndicator size="small" color="#FFFFFF" /> : <MaterialIcons name="refresh" size={16} color="#FFFFFF" />}
              <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>
                {auditing ? 'Running Live Audit…' : 'Run Live SEO & AI Audit'}
              </Text>
            </Pressable>
          </Card>

          {tasks.length > 0 && (
            <Card style={{ gap: 10 }}>
              <Text style={ui.heading}>Actionable SEO Fix Queue</Text>
              {tasks.slice(0, 10).map((t: any) => {
                const canAutoFix =
                  t.status === 'open' &&
                  t.autoFixable &&
                  (t.fixActionKey === 'activate_hosted_site' || t.fixActionKey === 'hosted_seo_enrich');
                return (
                  <View
                    key={t.id}
                    style={{
                      padding: 12,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: colors.line,
                      gap: 6,
                    }}
                  >
                    <View style={[ui.row, { justifyContent: 'space-between' }]}>
                      <Text style={{ fontSize: 12.5, fontWeight: '800', color: colors.ink, flex: 1 }}>
                        {t.title}
                      </Text>
                      <Text style={{ fontSize: 10, fontWeight: '800', color: t.status === 'applied' ? colors.brand : colors.noteText }}>
                        {t.status.toUpperCase()}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 11.5, color: colors.muted }}>{t.description}</Text>
                    {canAutoFix && (
                      <Pressable
                        disabled={Boolean(fixingKey)}
                        onPress={() => void applyFix(t.fixActionKey, t.id)}
                        style={{
                          alignSelf: 'flex-start',
                          backgroundColor: colors.brand,
                          paddingHorizontal: 12,
                          paddingVertical: 7,
                          borderRadius: 8,
                        }}
                      >
                        <Text style={{ color: '#FFFFFF', fontSize: 11.5, fontWeight: '800' }}>
                          {fixingKey === t.id ? 'Applying…' : '1-Click Auto-Fix'}
                        </Text>
                      </Pressable>
                    )}
                    {t.status === 'applied' && t.hasRollback && (
                      <Pressable
                        disabled={Boolean(fixingKey)}
                        onPress={() => void runRollback(t.id)}
                        style={{
                          alignSelf: 'flex-start',
                          backgroundColor: colors.background,
                          borderWidth: 1,
                          borderColor: colors.line,
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderRadius: 8,
                        }}
                      >
                        <Text style={{ color: colors.ink, fontSize: 11, fontWeight: '700' }}>Rollback</Text>
                      </Pressable>
                    )}
                  </View>
                );
              })}
            </Card>
          )}
        </View>
      )}

      {tab === 'grid' && (
        <View style={{ gap: 12 }}>
          <ErrorNotice message={rankingsRes.error} retry={rankingsRes.refresh} />

          <Card style={{ gap: 10 }}>
            <Text style={ui.heading}>Maps Geo-Grid &amp; Web SERP Check</Text>
            <TextInput
              placeholder="Enter target keyword (e.g. salon near me)"
              placeholderTextColor={colors.muted}
              value={gridKeyword}
              onChangeText={setGridKeyword}
              style={ui.input}
            />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {([3, 5] as const).map((sz) => (
                <Pressable
                  key={sz}
                  onPress={() => setGridSize(sz)}
                  style={{
                    flex: 1,
                    paddingVertical: 8,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: gridSize === sz ? colors.brand : colors.line,
                    backgroundColor: gridSize === sz ? colors.brandSoft : colors.surface,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '800', color: gridSize === sz ? colors.brandDark : colors.ink }}>
                    {sz}x{sz} ({sz * sz} pts)
                  </Text>
                </Pressable>
              ))}
              {([1.5, 3, 5] as const).map((r) => (
                <Pressable
                  key={r}
                  onPress={() => setRadiusKm(r)}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: radiusKm === r ? colors.brand : colors.line,
                    backgroundColor: radiusKm === r ? colors.brandSoft : colors.surface,
                  }}
                >
                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: radiusKm === r ? colors.brandDark : colors.ink }}>
                    {r}km
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable
                disabled={scanningGrid || !rankingsRes.data?.configured}
                onPress={() => void runGridScan()}
                style={{
                  flex: 1,
                  backgroundColor: rankingsRes.data?.configured ? colors.brand : colors.muted,
                  paddingVertical: 11,
                  borderRadius: 10,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 12.5, fontWeight: '800' }}>
                  {scanningGrid ? 'Scanning…' : 'Run Geo-Grid'}
                </Text>
              </Pressable>
              <Pressable
                disabled={scanningOrganic || !rankingsRes.data?.configured}
                onPress={() => void runOrganicCheck()}
                style={{
                  flex: 1,
                  backgroundColor: rankingsRes.data?.configured ? colors.ink : colors.muted,
                  paddingVertical: 11,
                  borderRadius: 10,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 12.5, fontWeight: '800' }}>
                  {scanningOrganic ? 'Checking…' : 'Check Web + AIO'}
                </Text>
              </Pressable>
            </View>
          </Card>

          {latestGrid ? (
            <Card style={{ gap: 10 }}>
              <Text style={ui.heading}>
                &ldquo;{latestGrid.keyword}&rdquo; ({latestGrid.gridSize}x{latestGrid.gridSize})
              </Text>
              <Text style={ui.caption}>
                Avg Rank: {latestGrid.avgRank ?? '—'} · Top-3 Coverage: {latestGrid.top3Pct}%
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {latestGrid.points.map((pt, idx) => {
                  const palette = gridTileColors(pt.rank);
                  const basis = latestGrid.gridSize === 5 ? '18%' : '31%';
                  return (
                    <View
                      key={`${pt.row}-${pt.col}-${idx}`}
                      style={{
                        width: basis,
                        aspectRatio: 1,
                        borderRadius: 10,
                        backgroundColor: palette.bg,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ color: palette.fg, fontSize: 14, fontWeight: '900' }}>
                        {pt.rank != null ? `#${pt.rank}` : '—'}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </Card>
          ) : (
            <Empty title="No Geo-Grid scan yet" detail="Run a 3x3 or 5x5 Maps Geo-Grid scan above." />
          )}

          {(rankingsRes.data?.organicScans?.length || 0) > 0 && (
            <Card style={{ gap: 8 }}>
              <Text style={ui.heading}>Google Web &amp; AI Overviews</Text>
              {rankingsRes.data!.organicScans!.map((o) => (
                <View key={o.id} style={[ui.row, { justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.line }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.ink }}>{o.keyword}</Text>
                    <Text style={{ fontSize: 10.5, color: colors.muted }}>
                      {o.aiOverviewCited ? 'Cited in Google AI Overview!' : o.aiOverviewPresent ? 'AI Overview Present' : 'No AI Overview'}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 12.5, fontWeight: '800', color: o.organicRank != null ? colors.brandDark : colors.muted }}>
                    {o.organicRank != null ? `Web #${o.organicRank}` : 'Unranked'}
                  </Text>
                </View>
              ))}
            </Card>
          )}
        </View>
      )}

      {tab === 'gap' && (
        <View style={{ gap: 12 }}>
          <ErrorNotice message={aiGapRes.error} retry={aiGapRes.refresh} />

          <Card style={{ gap: 10 }}>
            <Text style={ui.heading}>AI Search &amp; Competitor Comparison</Text>
            <Text style={ui.caption}>
              Sampled AI visibility benchmark testing live buyer-intent prompts alongside competitor website &amp; Schema audits.
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable
                disabled={scanningGap}
                onPress={() => void runAiGap(false)}
                style={{
                  flex: 1,
                  backgroundColor: colors.brand,
                  paddingVertical: 11,
                  borderRadius: 10,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>
                  {scanningGap ? 'Testing AI…' : 'Run AI Visibility Scan'}
                </Text>
              </Pressable>
              <Pressable
                disabled={scanningGap}
                onPress={() => void runAiGap(true)}
                style={{
                  flex: 1,
                  backgroundColor: colors.ink,
                  paddingVertical: 11,
                  borderRadius: 10,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>
                  Create Improvement Plan
                </Text>
              </Pressable>
            </View>
          </Card>

          {aiGapRes.loading && !gapReport ? (
            <Loading />
          ) : !gapReport ? (
            <Empty
              title="No AI Visibility report yet"
              detail="Tap Run AI Visibility Scan to check ChatGPT Search, Gemini, Perplexity & competitor websites."
            />
          ) : (
            <>
              <Card style={{ gap: 8 }}>
                <Text style={ui.heading}>Platform Visibility Breakdown</Text>
                {gapReport.engineSummaries.map((eng) => (
                  <View
                    key={eng.platform}
                    style={[ui.row, { justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.line }]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.ink }}>{eng.label}</Text>
                      <Text style={{ fontSize: 10.5, color: colors.muted }}>
                        {eng.status === 'measured'
                          ? `${eng.mentionsCount}/${eng.promptsCount} mentions · ${eng.citationsCount} citations`
                          : eng.note || 'Not configured'}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: eng.status === 'measured' ? colors.brandDark : colors.muted }}>
                      {eng.status === 'measured' ? `${eng.visibilityRate ?? 0}%` : 'N/A'}
                    </Text>
                  </View>
                ))}
              </Card>

              <Card style={{ gap: 8 }}>
                <Text style={ui.heading}>Contributing Factors &amp; Actions</Text>
                {gapReport.contributingFactors.map((f) => (
                  <View key={f.id} style={{ padding: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.line, gap: 4 }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: colors.ink }}>{f.title}</Text>
                    <Text style={{ fontSize: 11, color: colors.muted }}>{f.explanation}</Text>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.brandDark }}>{f.recommendedAction}</Text>
                  </View>
                ))}
              </Card>
            </>
          )}
        </View>
      )}
    </Screen>
  );
}
