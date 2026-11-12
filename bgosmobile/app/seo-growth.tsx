import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ErrorNotice, Loading, Screen, colors, ui } from '../src/components/ui';
import { SeoAuditTab, type AutoOptimizePlan, type PresenceSummary } from '../src/components/gbp/seo-audit-tab';
import { SeoGridTab, type RankingsResponse } from '../src/components/gbp/seo-grid-tab';
import { SeoAiVisibilityTab, type AiGapReport } from '../src/components/gbp/seo-ai-visibility-tab';
import { useResource } from '../src/hooks/use-resource';
import { apiRequest } from '../src/lib/api';

type SeoAuditResponse = {
  snapshot?: any;
  tasks?: any[];
  presence?: PresenceSummary;
  gbpScore?: number | null;
};

type AiGapResponse = {
  report?: AiGapReport | null;
};

export default function SeoGrowthScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const resolvedParamTab = params.tab === 'grid' || params.tab === 'gap' ? params.tab : 'audit';
  const [tab, setTab] = useState<'audit' | 'grid' | 'gap'>(resolvedParamTab);

  useEffect(() => {
    if (params.tab === 'audit' || params.tab === 'grid' || params.tab === 'gap') {
      setTab(params.tab);
    }
  }, [params.tab]);

  const auditRes = useResource<SeoAuditResponse>('/api/seo/audit');
  const rankingsRes = useResource<RankingsResponse>('/api/gbp/rankings');
  const aiGapRes = useResource<AiGapResponse>('/api/seo/ai-competitor-gap');
  const autoOptRes = useResource<AutoOptimizePlan>('/api/gbp/auto-optimize');

  const [auditing, setAuditing] = useState(false);
  const [fixingKey, setFixingKey] = useState<string | null>(null);
  const [optimizingAll, setOptimizingAll] = useState(false);

  const [gridKeyword, setGridKeyword] = useState('');
  const [gridSize, setGridSize] = useState<3 | 5>(3);
  const [radiusKm, setRadiusKm] = useState<number>(3);
  const [scanningGrid, setScanningGrid] = useState(false);
  const [scanningOrganic, setScanningOrganic] = useState(false);
  const [nativeBusy, setNativeBusy] = useState(false);
  const [savingLocation, setSavingLocation] = useState(false);

  const [promptsText, setPromptsText] = useState('');
  const [includeOpenAi, setIncludeOpenAi] = useState(true);
  const [scanningGap, setScanningGap] = useState(false);
  const [creatingPlan, setCreatingPlan] = useState(false);

  useEffect(() => {
    if (!gridKeyword && rankingsRes.data?.autoDefaults?.suggestedKeywords?.length) {
      setGridKeyword(rankingsRes.data.autoDefaults.suggestedKeywords[0]);
    }
  }, [gridKeyword, rankingsRes.data?.autoDefaults?.suggestedKeywords]);

  const report = auditRes.data?.snapshot;
  const presence = report?.presence || auditRes.data?.presence;
  const tasks = useMemo<any[]>(
    () => auditRes.data?.tasks || report?.tasks || [],
    [auditRes.data?.tasks, report?.tasks],
  );
  const openTasksCount = useMemo(() => tasks.filter((t) => t.status === 'open').length, [tasks]);
  const gapReport = aiGapRes.data?.report || null;

  const overallScore = report?.overallScore ?? null;
  const gbpScore = report?.gbpScore ?? auditRes.data?.gbpScore ?? null;
  const aiScore = report?.aiReadinessScore ?? null;

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
      await Promise.all([auditRes.refresh(), rankingsRes.refresh(), autoOptRes.refresh()]);
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

  async function dismissTask(taskId: string) {
    setFixingKey(taskId);
    try {
      await apiRequest('/api/seo/fixes', {
        method: 'POST',
        body: { action: 'dismiss', taskId },
      });
      await auditRes.refresh();
    } catch (e) {
      Alert.alert('Dismiss Failed', (e as Error).message || 'Could not dismiss task');
    } finally {
      setFixingKey(null);
    }
  }

  async function runAutoOptimize(mode: 'apply' | 'rollback' = 'apply') {
    setOptimizingAll(true);
    try {
      const res = await apiRequest<{
        scoreBefore?: number;
        scoreAfter?: number;
        gradeAfter?: string;
        appliedSteps?: string[];
        syncedToGoogle?: boolean;
      }>('/api/gbp/auto-optimize', {
        method: 'POST',
        body: { mode, pushToGoogle: true },
      });
      await Promise.all([autoOptRes.refresh(), auditRes.refresh(), rankingsRes.refresh()]);
      if (mode === 'rollback') {
        Alert.alert('Snapshot Restored', `GBP score is now ${res.scoreAfter ?? '—'}%.`);
      } else {
        Alert.alert(
          'GBP Auto-Optimized',
          `Score moved from ${res.scoreBefore ?? '—'}% to ${res.scoreAfter ?? '—'}% (${res.gradeAfter || ''}).\nSteps: ${(res.appliedSteps || []).join(', ') || 'applied'}.${res.syncedToGoogle ? '\nSynced to Google Business Profile.' : ''}`,
        );
      }
    } catch (e) {
      Alert.alert('Auto-Optimizer', (e as Error).message || 'Could not optimize profile');
    } finally {
      setOptimizingAll(false);
    }
  }

  async function saveGeoConfig(placeId: string, lat: number, lng: number) {
    setSavingLocation(true);
    try {
      await apiRequest('/api/gbp/rankings', {
        method: 'POST',
        body: { mode: 'save_geo_config', placeId, centerLat: lat, centerLng: lng },
      });
      await rankingsRes.refresh();
      Alert.alert('Location Saved', 'Pinned Place ID & map coordinates updated for future Geo-Grid scans.');
    } catch (e) {
      Alert.alert('Location Config', (e as Error).message || 'Could not save location coordinates');
    } finally {
      setSavingLocation(false);
    }
  }

  async function refreshNativeDiscovery() {
    setNativeBusy(true);
    try {
      await apiRequest('/api/gbp/rankings', {
        method: 'POST',
        body: { provider: 'google_native' },
      });
      await rankingsRes.refresh();
      Alert.alert('Synced', 'Latest Google Search Terms & Maps impressions loaded.');
    } catch (e) {
      Alert.alert('Google Sync Failed', (e as Error).message || 'Could not sync Google Search Terms');
    } finally {
      setNativeBusy(false);
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
      Alert.alert('Geo-Grid Scan', (e as Error).message || 'Could not complete Maps Geo-Grid scan');
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
      Alert.alert('SERP Check', (e as Error).message || 'Could not check web & AI citation rankings');
    } finally {
      setScanningOrganic(false);
    }
  }

  function parsePrompts(): string[] | undefined {
    const list = promptsText
      .split('\n')
      .map((p) => p.trim())
      .filter(Boolean)
      .slice(0, 5);
    return list.length > 0 ? list : undefined;
  }

  async function runAiGapScan() {
    setScanningGap(true);
    try {
      const res = await apiRequest<AiGapResponse>('/api/seo/ai-competitor-gap', {
        method: 'POST',
        body: {
          customPrompts: parsePrompts(),
          includeOpenAi,
          createPlan: false,
        },
      });
      aiGapRes.setData(res);
    } catch (e) {
      Alert.alert('AI Visibility Scan', (e as Error).message || 'Could not complete AI visibility scan');
    } finally {
      setScanningGap(false);
    }
  }

  async function createAiGapPlan() {
    setCreatingPlan(true);
    try {
      const res = await apiRequest<AiGapResponse>('/api/seo/ai-competitor-gap', {
        method: 'POST',
        body: {
          customPrompts: parsePrompts(),
          includeOpenAi,
          createPlan: true,
          createPlanOnly: Boolean(gapReport),
        },
      });
      aiGapRes.setData(res);
      await auditRes.refresh();
      Alert.alert(
        'Improvement Plan Created',
        `Added ${res.report?.planCreatedCount || 0} actionable tasks to your SEO Fix Queue.`,
      );
    } catch (e) {
      Alert.alert('Improvement Plan', (e as Error).message || 'Could not create improvement plan');
    } finally {
      setCreatingPlan(false);
    }
  }

  return (
    <Screen
      title="AI Search & SEO"
      subtitle="Audit · Geo-Grid · AI Visibility"
      headerIcon="travel-explore"
      showBack={true}
      onBack={() => {
        if (router.canGoBack?.()) router.back();
        else router.replace('/(tabs)');
      }}
      onRefresh={() =>
        Promise.all([
          auditRes.refresh(),
          rankingsRes.refresh(),
          aiGapRes.refresh(),
          autoOptRes.refresh(),
        ])
      }
    >
      {/* Top Unified Readiness Summary */}
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: 16,
          padding: 12,
          borderWidth: 1,
          borderColor: colors.line,
          gap: 10,
        }}
      >
        <View style={[ui.row, { justifyContent: 'space-between' }]}>
          <View style={[ui.row, { gap: 6 }]}>
            <MaterialIcons name="auto-awesome" size={16} color={colors.brand} />
            <Text style={{ fontSize: 12, fontWeight: '800', color: colors.ink }}>
              Search Readiness Overview
            </Text>
          </View>
          <View
            style={{
              backgroundColor:
                presence?.mode === 'custom_domain'
                  ? '#DBEAFE'
                  : presence?.mode === 'bgos_hosted'
                    ? colors.brandSoft
                    : '#FEF3C7',
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 7,
            }}
          >
            <Text
              style={{
                fontSize: 10,
                fontWeight: '800',
                color:
                  presence?.mode === 'custom_domain'
                    ? '#1D4ED8'
                    : presence?.mode === 'bgos_hosted'
                      ? colors.brandDark
                      : '#B45309',
              }}
            >
              {presence?.mode === 'custom_domain'
                ? 'Live Domain'
                : presence?.mode === 'bgos_hosted'
                  ? 'BGOS Hosted'
                  : 'No Website'}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[
            {
              label: 'Overall',
              val: overallScore != null ? `${overallScore}/100` : '—',
              accent: colors.ink,
            },
            {
              label: 'GBP Health',
              val: gbpScore != null ? `${gbpScore}/100` : '—',
              accent: colors.brand,
            },
            {
              label: 'AI Ready',
              val: aiScore != null ? `${aiScore}/100` : '—',
              accent: '#7C3AED',
            },
            {
              label: 'Open Fixes',
              val: String(openTasksCount),
              accent: openTasksCount > 0 ? '#D97706' : colors.brand,
            },
          ].map((stat) => (
            <View
              key={stat.label}
              style={{
                flex: 1,
                backgroundColor: colors.background,
                borderRadius: 10,
                paddingVertical: 7,
                paddingHorizontal: 6,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: colors.line,
              }}
            >
              <Text style={{ fontSize: 13.5, fontWeight: '900', color: stat.accent }}>
                {stat.val}
              </Text>
              <Text style={{ fontSize: 9.5, fontWeight: '700', color: colors.muted, marginTop: 1 }}>
                {stat.label}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Segmented 3-Tab Switcher */}
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: colors.surface,
          borderRadius: 14,
          padding: 4,
          borderWidth: 1,
          borderColor: colors.line,
          gap: 4,
        }}
      >
        {[
          {
            id: 'audit' as const,
            label: 'SEO Audit',
            badge: openTasksCount > 0 ? openTasksCount : undefined,
          },
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
                paddingVertical: 9,
                paddingHorizontal: 6,
                borderRadius: 10,
                backgroundColor: active ? colors.brand : 'transparent',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
              }}
            >
              <Text
                style={{
                  fontSize: 11.5,
                  fontWeight: '800',
                  color: active ? '#FFFFFF' : colors.ink,
                }}
                numberOfLines={1}
              >
                {item.label}
              </Text>
              {item.badge ? (
                <View
                  style={{
                    minWidth: 17,
                    height: 17,
                    borderRadius: 9,
                    paddingHorizontal: 4,
                    backgroundColor: active ? '#FFFFFF' : '#FEF3C7',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 9.5,
                      fontWeight: '900',
                      color: active ? colors.brandDark : '#B45309',
                    }}
                  >
                    {item.badge}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      {tab === 'audit' && (
        <View style={{ gap: 10 }}>
          <ErrorNotice message={auditRes.error} retry={auditRes.refresh} />
          {auditRes.loading && !auditRes.data ? (
            <Loading />
          ) : (
            <SeoAuditTab
              report={report}
              presence={presence}
              tasks={tasks}
              gbpScoreFallback={auditRes.data?.gbpScore}
              autoOptPlan={autoOptRes.data || null}
              auditing={auditing}
              fixingKey={fixingKey}
              optimizingAll={optimizingAll}
              onRunAudit={runAudit}
              onApplyFix={applyFix}
              onRollback={runRollback}
              onDismissTask={dismissTask}
              onRunAutoOptimize={runAutoOptimize}
            />
          )}
        </View>
      )}

      {tab === 'grid' && (
        <View style={{ gap: 10 }}>
          <ErrorNotice message={rankingsRes.error} retry={rankingsRes.refresh} />
          {rankingsRes.loading && !rankingsRes.data ? (
            <Loading />
          ) : (
            <SeoGridTab
              data={rankingsRes.data || undefined}
              gridKeyword={gridKeyword}
              setGridKeyword={setGridKeyword}
              gridSize={gridSize}
              setGridSize={setGridSize}
              radiusKm={radiusKm}
              setRadiusKm={setRadiusKm}
              scanningGrid={scanningGrid}
              scanningOrganic={scanningOrganic}
              nativeBusy={nativeBusy}
              savingLocation={savingLocation}
              onRunGridScan={runGridScan}
              onRunOrganicCheck={runOrganicCheck}
              onRefreshNative={refreshNativeDiscovery}
              onSaveGeoConfig={saveGeoConfig}
              onGoToAudit={() => setTab('audit')}
            />
          )}
        </View>
      )}

      {tab === 'gap' && (
        <View style={{ gap: 10 }}>
          <ErrorNotice message={aiGapRes.error} retry={aiGapRes.refresh} />
          <SeoAiVisibilityTab
            report={gapReport}
            loading={aiGapRes.loading}
            scanningGap={scanningGap}
            creatingPlan={creatingPlan}
            fixingKey={fixingKey}
            promptsText={promptsText}
            setPromptsText={setPromptsText}
            includeOpenAi={includeOpenAi}
            setIncludeOpenAi={setIncludeOpenAi}
            onRunScan={runAiGapScan}
            onCreatePlan={createAiGapPlan}
            onApplyFix={(actionKey) => applyFix(actionKey)}
          />
        </View>
      )}
    </Screen>
  );
}
