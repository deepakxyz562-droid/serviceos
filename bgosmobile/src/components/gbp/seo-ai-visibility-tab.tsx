import React, { useState } from 'react';
import { ActivityIndicator, Linking, Pressable, Switch, Text, TextInput, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Card, Empty, Loading, colors, ui } from '../ui';

export interface AiGapReport {
  scannedAt: string;
  disclaimer: string;
  promptsTested?: string[];
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
  results?: Array<{
    platform: string;
    status: string;
    prompt: string;
    mentioned: boolean;
    websiteCited: boolean;
    citedUrls: string[];
    position: number | null;
    sentiment: 'positive' | 'neutral' | 'negative' | null;
    competitorsMentioned: string[];
    answerExcerpt: string | null;
    error?: string;
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
    wordCount?: number | null;
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
}

export function SeoAiVisibilityTab({
  report,
  loading,
  scanningGap,
  creatingPlan,
  fixingKey,
  promptsText,
  setPromptsText,
  includeOpenAi,
  setIncludeOpenAi,
  onRunScan,
  onCreatePlan,
  onApplyFix,
}: {
  report: AiGapReport | null;
  loading: boolean;
  scanningGap: boolean;
  creatingPlan: boolean;
  fixingKey: string | null;
  promptsText: string;
  setPromptsText: (val: string) => void;
  includeOpenAi: boolean;
  setIncludeOpenAi: (val: boolean) => void;
  onRunScan: () => void;
  onCreatePlan: () => void;
  onApplyFix: (actionKey: 'activate_hosted_site' | 'hosted_seo_enrich') => void;
}) {
  const [expandedPromptIdx, setExpandedPromptIdx] = useState<number | null>(null);

  return (
    <View style={{ gap: 12 }}>
      {/* Prompt Tester & Action Controls */}
      <Card style={{ gap: 10 }}>
        <View style={[ui.row, { justifyContent: 'space-between' }]}>
          <Text style={ui.heading}>AI Search &amp; Competitor Comparison</Text>
          {report?.scannedAt ? (
            <Text style={{ fontSize: 10.5, color: colors.muted }}>
              {new Date(report.scannedAt).toLocaleDateString()}
            </Text>
          ) : null}
        </View>
        <Text style={ui.caption}>
          {report?.disclaimer ||
            'Sampled buyer-intent benchmark measuring when ChatGPT, Gemini, Perplexity & AI Overviews mention you vs nearby competitors.'}
        </Text>

        <View style={{ gap: 5 }}>
          <Text style={{ fontSize: 11, fontWeight: '800', color: colors.ink }}>
            Customer Search Prompts (1 per line, max 5)
          </Text>
          <TextInput
            multiline
            numberOfLines={3}
            placeholder="Leave blank to auto-generate local buyer prompts from your city & services..."
            placeholderTextColor={colors.muted}
            value={promptsText}
            onChangeText={setPromptsText}
            style={[ui.input, { minHeight: 72, textAlignVertical: 'top', paddingTop: 9 }]}
          />
        </View>

        <View style={[ui.row, { justifyContent: 'space-between' }]}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.ink, flex: 1 }}>
            Include ChatGPT Search (OpenAI)
          </Text>
          <Switch
            value={includeOpenAi}
            onValueChange={setIncludeOpenAi}
            trackColor={{ false: '#CBD5E1', true: '#86EFAC' }}
            thumbColor={includeOpenAi ? colors.brand : '#F8FAFC'}
          />
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable
            disabled={scanningGap || creatingPlan}
            onPress={onRunScan}
            style={{
              flex: 1,
              backgroundColor: colors.brand,
              paddingVertical: 11,
              borderRadius: 10,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 5,
            }}
          >
            {scanningGap ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <MaterialIcons name="auto-awesome" size={15} color="#FFFFFF" />
            )}
            <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>
              {scanningGap ? 'Testing AI…' : 'Run AI Scan'}
            </Text>
          </Pressable>

          <Pressable
            disabled={scanningGap || creatingPlan}
            onPress={onCreatePlan}
            style={{
              flex: 1,
              backgroundColor: colors.ink,
              paddingVertical: 11,
              borderRadius: 10,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 5,
            }}
          >
            {creatingPlan ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <MaterialIcons name="playlist-add-check" size={16} color="#FFFFFF" />
            )}
            <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>
              {creatingPlan ? 'Creating…' : 'Create Fix Plan'}
            </Text>
          </Pressable>
        </View>
      </Card>

      {loading && !report ? (
        <Loading />
      ) : !report ? (
        <Empty
          title="No AI Visibility report yet"
          detail="Tap Run AI Scan above to benchmark ChatGPT Search, Gemini, Perplexity & competitor websites."
        />
      ) : (
        <>
          {/* 2x2 Engine Scoreboard */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {report.engineSummaries.map((eng) => {
              const measured = eng.status === 'measured';
              const rate = eng.visibilityRate ?? 0;
              return (
                <View
                  key={eng.platform}
                  style={{
                    width: '48.6%',
                    backgroundColor: colors.surface,
                    borderRadius: 13,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: colors.line,
                    gap: 4,
                  }}
                >
                  <Text style={{ fontSize: 11.5, fontWeight: '800', color: colors.ink }} numberOfLines={1}>
                    {eng.label}
                  </Text>
                  <Text
                    style={{
                      fontSize: measured ? 20 : 12.5,
                      fontWeight: '900',
                      color: measured ? (rate >= 50 ? colors.brand : rate > 0 ? '#D97706' : colors.ink) : colors.muted,
                    }}
                  >
                    {measured ? `${rate}%` : eng.status === 'error' ? 'Error' : 'Not Configured'}
                  </Text>
                  <Text style={{ fontSize: 10.5, color: colors.muted, lineHeight: 14 }} numberOfLines={2}>
                    {measured
                      ? `${eng.mentionsCount}/${eng.promptsCount} mentions · ${eng.citationsCount} cited`
                      : eng.note || 'Add API key or scan SERP'}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Local Competitor Comparison Matrix (Previously Omitted on Mobile!) */}
          <Card style={{ gap: 10 }}>
            <View style={[ui.row, { justifyContent: 'space-between' }]}>
              <Text style={ui.heading}>Competitor Signal Comparison</Text>
              <Text style={{ fontSize: 10.5, fontWeight: '700', color: colors.muted }}>
                Top {report.competitors?.length || 0} Nearby
              </Text>
            </View>
            {(report.competitors || []).length === 0 ? (
              <Text style={ui.caption}>
                No nearby competitors synced yet. Re-run AI Scan to auto-fetch nearby Google Maps competitors and audit their websites.
              </Text>
            ) : (
              report.competitors.map((comp) => {
                let host: string | null = null;
                if (comp.websiteUrl) {
                  try {
                    host = new URL(comp.websiteUrl).hostname.replace(/^www\./, '');
                  } catch {
                    host = comp.websiteUrl;
                  }
                }
                return (
                  <View
                    key={comp.id}
                    style={{
                      padding: 11,
                      borderRadius: 11,
                      borderWidth: 1,
                      borderColor: colors.line,
                      backgroundColor: colors.background,
                      gap: 6,
                    }}
                  >
                    <View style={[ui.row, { justifyContent: 'space-between', gap: 8 }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: colors.ink }} numberOfLines={1}>
                          {comp.name}
                        </Text>
                        {host && comp.websiteUrl ? (
                          <Pressable onPress={() => void Linking.openURL(comp.websiteUrl!).catch(() => {})}>
                            <Text style={{ fontSize: 11, color: colors.brandDark, fontWeight: '600' }} numberOfLines={1}>
                              {host} ↗
                            </Text>
                          </Pressable>
                        ) : (
                          <Text style={{ fontSize: 11, color: colors.muted }}>No website listed</Text>
                        )}
                      </View>

                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ fontSize: 12, fontWeight: '800', color: colors.ink }}>
                          {comp.aiMentionCount} AI mentions
                        </Text>
                        <Text style={{ fontSize: 11, color: colors.muted }}>
                          {comp.rating != null ? `${comp.rating}★` : '—'} ({comp.reviewCount ?? '—'} reviews)
                        </Text>
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
                      <View style={{ backgroundColor: colors.surface, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5, borderWidth: 1, borderColor: colors.line }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: colors.ink }}>
                          SEO: {comp.seoScore != null ? `${comp.seoScore}/100` : 'N/A'}
                          {comp.wordCount ? ` · ${comp.wordCount}w` : ''}
                        </Text>
                      </View>
                      <View
                        style={{
                          backgroundColor: comp.hasSchema ? '#DCFCE7' : '#F1F5F9',
                          paddingHorizontal: 7,
                          paddingVertical: 2,
                          borderRadius: 5,
                        }}
                      >
                        <Text style={{ fontSize: 10, fontWeight: '700', color: comp.hasSchema ? '#15803D' : colors.muted }}>
                          {comp.hasSchema ? 'JSON-LD ✓' : 'No Schema'}
                        </Text>
                      </View>
                      {comp.allowsAiBots !== null ? (
                        <View
                          style={{
                            backgroundColor: comp.allowsAiBots ? '#DCFCE7' : '#FEE2E2',
                            paddingHorizontal: 7,
                            paddingVertical: 2,
                            borderRadius: 5,
                          }}
                        >
                          <Text style={{ fontSize: 10, fontWeight: '700', color: comp.allowsAiBots ? '#15803D' : '#B91C1C' }}>
                            {comp.allowsAiBots ? 'AI Bots ✓' : 'Bots Blocked'}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                );
              })
            )}
          </Card>

          {/* Contributing Factors & Working 1-Click Auto-Fix */}
          <Card style={{ gap: 9 }}>
            <Text style={ui.heading}>Contributing Factors &amp; Actions</Text>
            {report.contributingFactors.map((f) => {
              const high = f.severity === 'high';
              const canOneClick =
                f.autoFixable &&
                (f.fixActionKey === 'activate_hosted_site' || f.fixActionKey === 'hosted_seo_enrich');
              return (
                <View key={f.id} style={{ padding: 11, borderRadius: 11, borderWidth: 1, borderColor: colors.line, gap: 5 }}>
                  <View style={[ui.row, { justifyContent: 'space-between', gap: 6 }]}>
                    <View
                      style={{
                        backgroundColor: high ? '#FEF2F2' : '#FFFBEB',
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderRadius: 5,
                      }}
                    >
                      <Text style={{ fontSize: 9.5, fontWeight: '800', color: high ? '#B91C1C' : '#B45309' }}>
                        {f.severity.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 12.5, fontWeight: '800', color: colors.ink }}>{f.title}</Text>
                  <Text style={{ fontSize: 11.5, color: colors.muted, lineHeight: 16 }}>{f.explanation}</Text>
                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: colors.brandDark }}>{f.recommendedAction}</Text>
                  {canOneClick ? (
                    <Pressable
                      disabled={Boolean(fixingKey)}
                      onPress={() => onApplyFix(f.fixActionKey as 'activate_hosted_site' | 'hosted_seo_enrich')}
                      style={{
                        alignSelf: 'flex-start',
                        marginTop: 2,
                        backgroundColor: colors.brand,
                        paddingHorizontal: 11,
                        paddingVertical: 6,
                        borderRadius: 8,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <MaterialIcons name="auto-awesome" size={13} color="#FFFFFF" />
                      <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800' }}>
                        {fixingKey === f.fixActionKey ? 'Applying…' : '1-Click Fix'}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              );
            })}
          </Card>

          {/* Tested Prompt Evidence & Cited URLs (Previously Omitted on Mobile!) */}
          {(report.results || []).length > 0 ? (
            <Card style={{ gap: 9 }}>
              <Text style={ui.heading}>Tested Prompt Evidence ({report.results!.length})</Text>
              {report.results!.map((r, idx) => {
                const isExpanded = expandedPromptIdx === idx;
                return (
                  <Pressable
                    key={`${r.platform}-${idx}`}
                    onPress={() => setExpandedPromptIdx(isExpanded ? null : idx)}
                    style={{
                      padding: 11,
                      borderRadius: 11,
                      borderWidth: 1,
                      borderColor: r.mentioned ? '#A7F3D0' : colors.line,
                      backgroundColor: r.mentioned ? '#F0FDF4' : colors.background,
                      gap: 5,
                    }}
                  >
                    <View style={[ui.row, { justifyContent: 'space-between', gap: 6 }]}>
                      <Text style={{ fontSize: 10.5, fontWeight: '900', color: colors.muted, textTransform: 'uppercase' }}>
                        {r.platform}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        {r.sentiment && r.mentioned ? (
                          <Text
                            style={{
                              fontSize: 10,
                              fontWeight: '700',
                              color: r.sentiment === 'negative' ? '#B91C1C' : '#15803D',
                            }}
                          >
                            {r.sentiment}
                          </Text>
                        ) : null}
                        <View
                          style={{
                            backgroundColor: r.mentioned ? colors.brand : '#E2E8F0',
                            paddingHorizontal: 7,
                            paddingVertical: 2,
                            borderRadius: 5,
                          }}
                        >
                          <Text style={{ fontSize: 10, fontWeight: '800', color: r.mentioned ? '#FFFFFF' : colors.ink }}>
                            {r.mentioned ? `Mentioned${r.position ? ` (#${r.position})` : ''}` : 'Not Mentioned'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <Text style={{ fontSize: 12, fontWeight: '800', color: colors.ink }}>&ldquo;{r.prompt}&rdquo;</Text>

                    {r.answerExcerpt ? (
                      <Text style={{ fontSize: 11, color: colors.muted, lineHeight: 16 }} numberOfLines={isExpanded ? 12 : 3}>
                        {r.answerExcerpt}
                      </Text>
                    ) : r.error ? (
                      <Text style={{ fontSize: 11, color: '#B91C1C' }}>{r.error}</Text>
                    ) : null}

                    {r.competitorsMentioned?.length > 0 ? (
                      <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#B45309' }}>
                        Competitors named: {r.competitorsMentioned.join(', ')}
                      </Text>
                    ) : null}

                    {isExpanded && r.citedUrls?.length > 0 ? (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 2 }}>
                        {r.citedUrls.slice(0, 4).map((url) => {
                          let host = url;
                          try {
                            host = new URL(url).hostname.replace(/^www\./, '');
                          } catch {}
                          return (
                            <Pressable
                              key={url}
                              onPress={() => void Linking.openURL(url).catch(() => {})}
                              style={{
                                backgroundColor: colors.surface,
                                borderWidth: 1,
                                borderColor: colors.line,
                                paddingHorizontal: 7,
                                paddingVertical: 3,
                                borderRadius: 6,
                              }}
                            >
                              <Text style={{ fontSize: 10, fontWeight: '700', color: colors.brandDark }}>{host} ↗</Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </Card>
          ) : null}
        </>
      )}
    </View>
  );
}
