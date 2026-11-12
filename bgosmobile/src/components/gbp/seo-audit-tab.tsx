import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, Share, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Card, colors, ui } from '../ui';

export interface PresenceSummary {
  mode: 'no_website' | 'bgos_hosted' | 'custom_domain';
  canonicalUrl: string | null;
  hostedCanonicalUrl: string;
  websiteUrl?: string | null;
  domain: string | null;
}

export interface AutoOptimizePlan {
  score: number;
  grade: string;
  connectedToGoogle: boolean;
  pendingCount: number;
  landingUrl: string;
  searchTermsUsed: string[];
  hasRollback: boolean;
  actions: Array<{
    id: string;
    title: string;
    subtitle: string;
    ready: boolean;
    alreadyOptimal: boolean;
    impact: 'high' | 'medium';
  }>;
}

function scoreColor(val: number | null | undefined): string {
  if (val == null) return colors.muted;
  if (val >= 75) return '#009F50';
  if (val >= 45) return '#D97706';
  return '#DC2626';
}

function severityBadgeColors(sev: string): { bg: string; fg: string; border: string } {
  const s = (sev || '').toLowerCase();
  if (s === 'high') return { bg: '#FEF2F2', fg: '#B91C1C', border: '#FECACA' };
  if (s === 'medium') return { bg: '#FFFBEB', fg: '#B45309', border: '#FDE68A' };
  return { bg: '#EFF6FF', fg: '#1D4ED8', border: '#BFDBFE' };
}

export function SeoAuditTab({
  report,
  presence,
  tasks,
  gbpScoreFallback,
  autoOptPlan,
  auditing,
  fixingKey,
  optimizingAll,
  onRunAudit,
  onApplyFix,
  onRollback,
  onDismissTask,
  onRunAutoOptimize,
}: {
  report: any;
  presence?: PresenceSummary;
  tasks: any[];
  gbpScoreFallback?: number | null;
  autoOptPlan?: AutoOptimizePlan | null;
  auditing: boolean;
  fixingKey: string | null;
  optimizingAll: boolean;
  onRunAudit: () => void;
  onApplyFix: (actionKey: 'activate_hosted_site' | 'hosted_seo_enrich', taskId?: string) => void;
  onRollback: (taskId: string) => void;
  onDismissTask: (taskId: string) => void;
  onRunAutoOptimize: (mode: 'apply' | 'rollback') => void;
}) {
  const [checklistExpanded, setChecklistExpanded] = useState(false);
  const [taskFilter, setTaskFilter] = useState<'open' | 'done'>('open');
  const [snippetTab, setSnippetTab] = useState<'robots' | 'meta' | 'schema'>('robots');

  const mode = presence?.mode || 'no_website';
  const auditedUrl = presence?.canonicalUrl || presence?.websiteUrl || null;
  const gbpVal = report?.gbpScore ?? gbpScoreFallback ?? null;

  const sortedChecks = useMemo(() => {
    const list: any[] = Array.isArray(report?.checks) ? [...report.checks] : [];
    return list.sort((a, b) => Number(a.passed) - Number(b.passed));
  }, [report?.checks]);

  const passedCount = sortedChecks.filter((c) => c.passed).length;

  const openTasks = useMemo(() => tasks.filter((t) => t.status === 'open'), [tasks]);
  const doneTasks = useMemo(() => tasks.filter((t) => t.status !== 'open'), [tasks]);
  const visibleTasks = taskFilter === 'open' ? openTasks : doneTasks;

  const activeSnippet = useMemo(() => {
    if (!report?.snippets) return '';
    if (snippetTab === 'robots') return report.snippets.robotsTxt || '';
    if (snippetTab === 'meta') return report.snippets.metaTags || '';
    return report.snippets.localBusinessJsonLd || '';
  }, [report?.snippets, snippetTab]);

  return (
    <View style={{ gap: 12 }}>
      {/* Presence & Scores Overview Card */}
      <Card style={{ gap: 12 }}>
        <View style={[ui.row, { justifyContent: 'space-between', alignItems: 'flex-start' }]}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={ui.heading}>Website &amp; AI Readiness</Text>
            <Text style={{ fontSize: 11.5, color: colors.muted }}>
              {report?.auditedAt
                ? `Last audited ${new Date(report.auditedAt).toLocaleDateString()}`
                : 'Audit Search bots, Schema JSON-LD & Core Web Vitals'}
            </Text>
          </View>
          <View
            style={{
              backgroundColor:
                mode === 'custom_domain' ? '#DBEAFE' : mode === 'bgos_hosted' ? colors.brandSoft : '#FEF3C7',
              paddingHorizontal: 9,
              paddingVertical: 4,
              borderRadius: 8,
            }}
          >
            <Text
              style={{
                fontSize: 10.5,
                fontWeight: '800',
                color: mode === 'custom_domain' ? '#1D4ED8' : mode === 'bgos_hosted' ? colors.brandDark : '#B45309',
              }}
            >
              {mode === 'custom_domain'
                ? 'Custom Domain'
                : mode === 'bgos_hosted'
                  ? `Hosted${report?.hostedProfileTier ? ` · Tier ${report.hostedProfileTier}` : ''}`
                  : 'No Website Yet'}
            </Text>
          </View>
        </View>

        {/* Live Audited URL strip */}
        {auditedUrl ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: colors.background,
              borderRadius: 10,
              paddingHorizontal: 10,
              paddingVertical: 8,
              borderWidth: 1,
              borderColor: colors.line,
              gap: 8,
            }}
          >
            <MaterialIcons name="public" size={16} color={colors.brand} />
            <Text style={{ flex: 1, fontSize: 11.5, fontWeight: '700', color: colors.ink }} numberOfLines={1}>
              {auditedUrl}
            </Text>
            <Pressable hitSlop={8} onPress={() => void Share.share({ message: auditedUrl, url: auditedUrl })}>
              <MaterialIcons name="share" size={16} color={colors.muted} />
            </Pressable>
            <Pressable hitSlop={8} onPress={() => void Linking.openURL(auditedUrl).catch(() => {})}>
              <MaterialIcons name="open-in-new" size={16} color={colors.brand} />
            </Pressable>
          </View>
        ) : null}

        {/* 4 Score Grid (2x2 with progress bars & clear labels) */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {[
            {
              label: 'Overall Score',
              val: report?.overallScore ?? null,
              sub: 'GBP + Site + AI',
              display: report?.overallScore != null ? `${report.overallScore}/100` : '—',
            },
            {
              label: 'Google Profile',
              val: gbpVal,
              sub: 'Maps 3-Pack',
              display: gbpVal != null ? `${gbpVal}/100` : '—',
            },
            {
              label: 'Website SEO',
              val: report?.websiteScore ?? null,
              sub: mode === 'no_website' ? 'Launch mini-site' : 'On-page & Schema',
              display:
                mode === 'no_website'
                  ? 'Not Active'
                  : report?.websiteScore != null
                    ? `${report.websiteScore}/100`
                    : '—',
            },
            {
              label: 'AI Readiness',
              val: report?.aiReadinessScore ?? null,
              sub: mode === 'no_website' ? 'Max 35 without site' : 'Crawlers & FAQs',
              display: report?.aiReadinessScore != null ? `${report.aiReadinessScore}/100` : '—',
            },
          ].map((m) => {
            const c = scoreColor(m.val);
            const pct = typeof m.val === 'number' ? Math.max(4, Math.min(100, m.val)) : 0;
            return (
              <View
                key={m.label}
                style={{
                  width: '48.5%',
                  backgroundColor: colors.background,
                  borderRadius: 12,
                  padding: 11,
                  borderWidth: 1,
                  borderColor: colors.line,
                  gap: 4,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.muted }}>{m.label}</Text>
                <Text style={{ fontSize: m.display === 'Not Active' ? 14 : 18, fontWeight: '900', color: c }}>
                  {m.display}
                </Text>
                <View style={{ height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, overflow: 'hidden' }}>
                  <View style={{ height: 4, width: `${pct}%`, backgroundColor: c, borderRadius: 2 }} />
                </View>
                <Text style={{ fontSize: 10, color: colors.muted }}>{m.sub}</Text>
              </View>
            );
          })}
        </View>

        {/* Primary Action CTAs */}
        {mode === 'no_website' ? (
          <View
            style={{
              backgroundColor: '#FFFBEB',
              borderRadius: 12,
              padding: 11,
              borderWidth: 1,
              borderColor: '#FDE68A',
              gap: 8,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '800', color: '#92400E' }}>
              No website linked — AI assistants cannot cite your services yet
            </Text>
            <Text style={{ fontSize: 11, color: '#78350F', lineHeight: 16 }}>
              Activate your free SEO mini-site ({presence?.hostedCanonicalUrl || 'fieseros.com'}) in 1 tap with LocalBusiness JSON-LD &amp; FAQs, then auto-sync to Google Business Profile.
            </Text>
            <Pressable
              disabled={Boolean(fixingKey)}
              onPress={() => onApplyFix('activate_hosted_site')}
              style={{
                backgroundColor: colors.brand,
                paddingVertical: 11,
                borderRadius: 10,
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
              <Text style={{ color: '#FFFFFF', fontSize: 12.5, fontWeight: '800' }}>
                Activate Free SEO Mini-Site (1-Click)
              </Text>
            </Pressable>
          </View>
        ) : null}

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable
            disabled={auditing}
            onPress={onRunAudit}
            style={{
              flex: 1,
              backgroundColor: colors.ink,
              paddingVertical: 11,
              borderRadius: 10,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            {auditing ? <ActivityIndicator size="small" color="#FFFFFF" /> : <MaterialIcons name="refresh" size={16} color="#FFFFFF" />}
            <Text style={{ color: '#FFFFFF', fontSize: 12.5, fontWeight: '800' }}>
              {auditing ? 'Auditing…' : report ? 'Re-Run Audit' : 'Run Live Audit'}
            </Text>
          </Pressable>

          {mode === 'bgos_hosted' ? (
            <Pressable
              disabled={Boolean(fixingKey)}
              onPress={() => onApplyFix('hosted_seo_enrich')}
              style={{
                flex: 1,
                backgroundColor: colors.brandSoft,
                borderWidth: 1,
                borderColor: colors.brand,
                paddingVertical: 11,
                borderRadius: 10,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 5,
              }}
            >
              {fixingKey === 'hosted_seo_enrich' ? (
                <ActivityIndicator size="small" color={colors.brandDark} />
              ) : (
                <MaterialIcons name="build" size={15} color={colors.brandDark} />
              )}
              <Text style={{ color: colors.brandDark, fontSize: 12, fontWeight: '800' }}>Enrich Copy &amp; FAQ</Text>
            </Pressable>
          ) : null}
        </View>
      </Card>

      {/* AI Search Crawler Access + Core Web Vitals */}
      {report && (report.robots?.crawlers?.length > 0 || report.cwv) ? (
        <Card style={{ gap: 12 }}>
          <View style={[ui.row, { justifyContent: 'space-between' }]}>
            <Text style={ui.heading}>AI Bots &amp; Technical Health</Text>
            {report.robots ? (
              <View
                style={{
                  backgroundColor: report.robots.hasSitemap ? colors.brandSoft : '#F1F5F9',
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 6,
                }}
              >
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: '800',
                    color: report.robots.hasSitemap ? colors.brandDark : colors.muted,
                  }}
                >
                  {report.robots.hasSitemap ? 'Sitemap Found' : 'No Sitemap'}
                </Text>
              </View>
            ) : null}
          </View>

          {report.robots?.crawlers?.length ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {report.robots.crawlers.map((c: any) => (
                <View
                  key={c.agent}
                  style={{
                    width: '48.8%',
                    backgroundColor: colors.background,
                    borderRadius: 9,
                    paddingHorizontal: 9,
                    paddingVertical: 7,
                    borderWidth: 1,
                    borderColor: colors.line,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 4,
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '800', color: colors.ink, flex: 1 }} numberOfLines={1}>
                    {c.agent}
                  </Text>
                  <View
                    style={{
                      backgroundColor: c.allowed ? '#DCFCE7' : '#FEE2E2',
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: 5,
                    }}
                  >
                    <Text style={{ fontSize: 9.5, fontWeight: '800', color: c.allowed ? '#15803D' : '#B91C1C' }}>
                      {c.allowed ? 'Allow' : 'Block'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : report.robots?.error ? (
            <Text style={{ fontSize: 11.5, color: colors.muted }}>{report.robots.error}</Text>
          ) : null}

          {/* Core Web Vitals strip */}
          <View style={{ borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 10, gap: 6 }}>
            <View style={[ui.row, { justifyContent: 'space-between' }]}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: colors.ink }}>Mobile Core Web Vitals</Text>
              {report.cwv?.available && report.cwv.performanceScore != null ? (
                <Text style={{ fontSize: 11, fontWeight: '800', color: scoreColor(report.cwv.performanceScore) }}>
                  Perf {report.cwv.performanceScore}/100
                </Text>
              ) : null}
            </View>
            {report.cwv?.available ? (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {[
                  { k: 'LCP', v: report.cwv.lcpMs != null ? `${(report.cwv.lcpMs / 1000).toFixed(2)}s` : '—' },
                  { k: 'CLS', v: report.cwv.cls != null ? String(report.cwv.cls) : '—' },
                  { k: 'INP', v: report.cwv.inpMs != null ? `${report.cwv.inpMs}ms` : '—' },
                ].map((metric) => (
                  <View
                    key={metric.k}
                    style={{
                      flex: 1,
                      backgroundColor: colors.background,
                      padding: 8,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: colors.line,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 10, color: colors.muted }}>{metric.k}</Text>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: colors.ink }}>{metric.v}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={{ fontSize: 11, color: colors.muted }}>
                {report.cwv?.reason || 'PageSpeed vitals appear after scanning a live public site.'}
              </Text>
            )}
          </View>
        </Card>
      ) : null}

      {/* Collapsible Technical Audit Checklist */}
      {sortedChecks.length > 0 ? (
        <Card style={{ gap: 10 }}>
          <Pressable
            onPress={() => setChecklistExpanded((p) => !p)}
            style={[ui.row, { justifyContent: 'space-between' }]}
          >
            <View style={{ flex: 1 }}>
              <Text style={ui.heading}>
                Audit Checklist ({passedCount}/{sortedChecks.length} Passed)
              </Text>
              <Text style={{ fontSize: 11, color: colors.muted }}>
                {checklistExpanded ? 'Tap to collapse' : 'Tap to inspect passed & failed checks'}
              </Text>
            </View>
            <MaterialIcons
              name={checklistExpanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
              size={22}
              color={colors.ink}
            />
          </Pressable>

          {(checklistExpanded ? sortedChecks : sortedChecks.filter((c) => !c.passed).slice(0, 3)).map((chk: any) => (
            <View
              key={chk.id}
              style={{
                flexDirection: 'row',
                gap: 8,
                padding: 10,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: chk.passed ? colors.line : '#FED7AA',
                backgroundColor: chk.passed ? colors.background : '#FFFDF7',
              }}
            >
              <MaterialIcons
                name={chk.passed ? 'check-circle' : 'error-outline'}
                size={17}
                color={chk.passed ? colors.brand : '#DC2626'}
                style={{ marginTop: 1 }}
              />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: colors.ink }}>{chk.label}</Text>
                <Text style={{ fontSize: 11, color: colors.muted }}>{chk.currentValue}</Text>
                {!chk.passed ? (
                  <Text style={{ fontSize: 11, color: '#9A3412', marginTop: 2 }}>{chk.recommendation}</Text>
                ) : null}
              </View>
            </View>
          ))}
        </Card>
      ) : null}

      {/* Streamlined 1-Click AI GBP Auto-Optimizer */}
      <Card style={{ gap: 10, borderColor: colors.brand, borderWidth: 1 }}>
        <View style={[ui.row, { justifyContent: 'space-between' }]}>
          <View style={{ flex: 1 }}>
            <Text style={ui.heading}>1-Click AI GBP Auto-Optimizer</Text>
            <Text style={ui.caption}>
              Applies Google Search Terms, Competitor Categories, Attributes &amp; 300–500 char Services with safe rollback.
            </Text>
          </View>
          <View style={{ backgroundColor: colors.brandSoft, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: colors.brandDark }}>
              {autoOptPlan ? `${autoOptPlan.score}% (${autoOptPlan.grade})` : 'AI Plan'}
            </Text>
          </View>
        </View>

        {autoOptPlan?.searchTermsUsed?.length ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
            {autoOptPlan.searchTermsUsed.slice(0, 4).map((kw) => (
              <View key={kw} style={{ backgroundColor: colors.soft, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                <Text style={{ fontSize: 10.5, fontWeight: '700', color: colors.ink }}>#{kw}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {(autoOptPlan?.actions || []).map((act) => (
          <View key={act.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 3 }}>
            <MaterialIcons
              name={act.alreadyOptimal ? 'check-circle' : act.ready ? 'bolt' : 'radio-button-unchecked'}
              size={16}
              color={act.alreadyOptimal ? colors.brand : act.ready ? '#D97706' : colors.muted}
            />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.ink }}>{act.title}</Text>
              <Text style={{ fontSize: 10.5, color: colors.muted }}>{act.subtitle}</Text>
            </View>
          </View>
        ))}

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable
            disabled={optimizingAll}
            onPress={() => onRunAutoOptimize('apply')}
            style={{
              flex: 1,
              backgroundColor: colors.brand,
              paddingVertical: 11,
              borderRadius: 10,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 6,
            }}
          >
            {optimizingAll ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <MaterialIcons name="auto-awesome" size={16} color="#FFFFFF" />
            )}
            <Text style={{ color: '#FFFFFF', fontSize: 12.5, fontWeight: '800' }}>
              {optimizingAll ? 'Optimizing…' : 'Optimize & Push to Google'}
            </Text>
          </Pressable>
          {autoOptPlan?.hasRollback ? (
            <Pressable
              disabled={optimizingAll}
              onPress={() => onRunAutoOptimize('rollback')}
              style={{
                backgroundColor: colors.soft,
                borderWidth: 1,
                borderColor: colors.line,
                paddingHorizontal: 14,
                borderRadius: 10,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '800', color: colors.ink }}>Undo</Text>
            </Pressable>
          ) : null}
        </View>
      </Card>

      {/* Actionable Fix Queue with Open / Completed Filter + Dismiss */}
      {tasks.length > 0 ? (
        <Card style={{ gap: 10 }}>
          <View style={[ui.row, { justifyContent: 'space-between' }]}>
            <Text style={ui.heading}>Actionable SEO Fix Queue</Text>
            <View style={{ flexDirection: 'row', backgroundColor: '#F1F5F9', padding: 2, borderRadius: 8 }}>
              {[
                { id: 'open' as const, label: `Open (${openTasks.length})` },
                { id: 'done' as const, label: `History (${doneTasks.length})` },
              ].map((f) => (
                <Pressable
                  key={f.id}
                  onPress={() => setTaskFilter(f.id)}
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 6,
                    backgroundColor: taskFilter === f.id ? colors.surface : 'transparent',
                  }}
                >
                  <Text style={{ fontSize: 10.5, fontWeight: '800', color: taskFilter === f.id ? colors.ink : colors.muted }}>
                    {f.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {visibleTasks.length === 0 ? (
            <Text style={{ fontSize: 12, color: colors.muted, paddingVertical: 6 }}>
              {taskFilter === 'open' ? 'No open SEO issues — great shape!' : 'No applied or dismissed fixes yet.'}
            </Text>
          ) : (
            visibleTasks.slice(0, 12).map((t: any) => {
              const canAutoFix =
                t.status === 'open' &&
                t.autoFixable &&
                (t.fixActionKey === 'activate_hosted_site' || t.fixActionKey === 'hosted_seo_enrich');
              const badge = severityBadgeColors(t.severity);
              return (
                <View
                  key={t.id}
                  style={{
                    padding: 11,
                    borderRadius: 11,
                    borderWidth: 1,
                    borderColor: colors.line,
                    gap: 6,
                  }}
                >
                  <View style={[ui.row, { justifyContent: 'space-between', gap: 6 }]}>
                    <View
                      style={{
                        backgroundColor: t.status === 'applied' ? colors.brandSoft : badge.bg,
                        borderWidth: 1,
                        borderColor: t.status === 'applied' ? colors.brand : badge.border,
                        paddingHorizontal: 7,
                        paddingVertical: 2,
                        borderRadius: 5,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 9.5,
                          fontWeight: '800',
                          color: t.status === 'applied' ? colors.brandDark : badge.fg,
                        }}
                      >
                        {t.status === 'open' ? String(t.severity || 'MEDIUM').toUpperCase() : String(t.status).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: colors.muted }}>
                      {t.source === 'ai_gap' ? 'AI Visibility' : 'Audit'}
                    </Text>
                  </View>

                  <Text style={{ fontSize: 12.5, fontWeight: '800', color: colors.ink }}>{t.title}</Text>
                  <Text style={{ fontSize: 11.5, color: colors.muted, lineHeight: 16 }}>{t.description}</Text>

                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 2 }}>
                    {canAutoFix ? (
                      <Pressable
                        disabled={Boolean(fixingKey)}
                        onPress={() => onApplyFix(t.fixActionKey, t.id)}
                        style={{
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
                    ) : null}

                    {t.status === 'open' && !canAutoFix ? (
                      <Pressable
                        disabled={Boolean(fixingKey)}
                        onPress={() => onDismissTask(t.id)}
                        style={{
                          backgroundColor: colors.background,
                          borderWidth: 1,
                          borderColor: colors.line,
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderRadius: 8,
                        }}
                      >
                        <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '700' }}>Dismiss</Text>
                      </Pressable>
                    ) : null}

                    {t.status === 'applied' && t.hasRollback ? (
                      <Pressable
                        disabled={Boolean(fixingKey)}
                        onPress={() => onRollback(t.id)}
                        style={{
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
                    ) : null}
                  </View>
                </View>
              );
            })
          )}
        </Card>
      ) : null}

      {/* Custom Domain Copyable Code Snippets */}
      {report?.snippets ? (
        <Card style={{ gap: 10 }}>
          <Text style={ui.heading}>Custom Website Code Patches ({presence?.domain})</Text>
          <Text style={ui.caption}>
            Share or copy these patches to your website host so AI assistants can crawl &amp; cite your business.
          </Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {([
              { id: 'robots', label: 'robots.txt' },
              { id: 'meta', label: 'HTML Meta' },
              { id: 'schema', label: 'JSON-LD' },
            ] as const).map((s) => (
              <Pressable
                key={s.id}
                onPress={() => setSnippetTab(s.id)}
                style={{
                  flex: 1,
                  paddingVertical: 7,
                  borderRadius: 8,
                  alignItems: 'center',
                  backgroundColor: snippetTab === s.id ? colors.ink : colors.background,
                  borderWidth: 1,
                  borderColor: snippetTab === s.id ? colors.ink : colors.line,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '800', color: snippetTab === s.id ? '#FFFFFF' : colors.ink }}>
                  {s.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={{ backgroundColor: '#0F172A', borderRadius: 10, padding: 11 }}>
            <Text style={{ fontFamily: 'monospace', fontSize: 10.5, color: '#86EFAC' }} numberOfLines={12}>
              {activeSnippet}
            </Text>
          </View>
          <Pressable
            onPress={() => void Share.share({ message: activeSnippet })}
            style={{
              backgroundColor: colors.brandSoft,
              borderWidth: 1,
              borderColor: colors.brand,
              paddingVertical: 9,
              borderRadius: 9,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <MaterialIcons name="share" size={15} color={colors.brandDark} />
            <Text style={{ fontSize: 12, fontWeight: '800', color: colors.brandDark }}>Share / Export Code Patch</Text>
          </Pressable>
        </Card>
      ) : null}
    </View>
  );
}
