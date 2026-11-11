import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Card, Empty, ErrorNotice, Screen, colors, ui } from '../src/components/ui';
import { useResource } from '../src/hooks/use-resource';
import { apiRequest } from '../src/lib/api';

type WinnabilityItem = {
  keyword: string;
  demandSignal: string;
  nativeImpressions: number;
  inAutocomplete: boolean;
  competitionLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  competitionIndex: number;
  winnabilityScore: number;
  winnabilityTier: 'Quick Win' | 'Winnable' | 'Competitive';
  yourPlacesRank: number | null;
  top3AvgReviews: number | null;
  topCompetitorName: string | null;
  reason: string;
};

type SearchTermItem = {
  keyword: string;
  count: number;
  isThreshold?: boolean;
};

type TrackedKeyword = {
  id: string;
  keyword: string;
  city: string | null;
  country: string;
  score: number | null;
  position: number | null;
  mapsRank?: number | null;
  organicRank?: number | null;
  aiOverviewCited?: boolean | null;
  winnability?: WinnabilityItem;
  source: string;
};

type KeywordPlanResponse = {
  keywords: TrackedKeyword[];
  suggestedStarterKeywords?: string[];
  searchTerms?: SearchTermItem[];
  searchTermsUpdatedAt?: string | null;
  winnabilityByKeyword?: Record<string, WinnabilityItem>;
  locale?: { country: string; countryName: string; flag: string };
  defaultCity?: string | null;
  migrationRequired: boolean;
};

type Suggestion = {
  keyword: string;
  score: number;
  city: string | null;
  sourceTag?: 'gbp_search' | 'google_suggest' | 'ai' | 'local';
  demandSignal?: string;
};

function tierColors(tier: WinnabilityItem['winnabilityTier']): { bg: string; fg: string } {
  if (tier === 'Quick Win') return { bg: '#DCFCE7', fg: '#15803D' };
  if (tier === 'Winnable') return { bg: '#DBEAFE', fg: '#1D4ED8' };
  return { bg: '#FEF3C7', fg: '#B45309' };
}

/**
 * Keyword Planner (DataForSEO-free):
 *  - SEARCH TERMS: real Google Business Profile Search Terms -> Turn into 300-500c Service or Track
 *  - WINNABLE KEYWORDS: Google Autocomplete + Top-5 Google Places Competition Analyzer
 *  - TRACKED & DISCOVER: tracked rank list, Google Autocomplete + AI suggestions, manual add/delete
 */
export default function KeywordPlannerScreen() {
  const router = useRouter();
  const plan = useResource<KeywordPlanResponse>('/api/gbp/keyword-plan');

  const [tab, setTab] = useState<'search_terms' | 'winnable' | 'tracked'>('search_terms');
  const [newKeyword, setNewKeyword] = useState('');
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [city, setCity] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [addingSuggestion, setAddingSuggestion] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzedList, setAnalyzedList] = useState<WinnabilityItem[] | null>(null);
  const [writingServiceKw, setWritingServiceKw] = useState<string | null>(null);

  const keywords = plan.data?.keywords || [];
  const searchTerms = plan.data?.searchTerms || [];
  const starterKeywords = plan.data?.suggestedStarterKeywords || [];
  const locale = plan.data?.locale || { country: 'GLOBAL', countryName: 'Local Market', flag: '🌍' };

  const winnabilityItems = useMemo<WinnabilityItem[]>(() => {
    if (analyzedList && analyzedList.length > 0) return analyzedList;
    const map = plan.data?.winnabilityByKeyword || {};
    return Object.values(map).sort((a, b) => b.winnabilityScore - a.winnabilityScore);
  }, [analyzedList, plan.data?.winnabilityByKeyword]);

  useEffect(() => {
    if (!city && plan.data?.defaultCity) {
      setCity(plan.data.defaultCity);
    }
  }, [city, plan.data?.defaultCity]);

  async function addKeyword(keyword: string, opts?: { score?: number; city?: string | null; source?: 'manual' | 'ai' }) {
    const trimmed = keyword.trim().toLowerCase();
    if (!trimmed) {
      setActionError('Type a keyword first.');
      return;
    }
    setActionError(null);
    const cityValue = opts?.city !== undefined ? opts.city : city.trim() || null;
    setAdding(true);
    try {
      await apiRequest('/api/gbp/keyword-plan', {
        method: 'POST',
        body: {
          keyword: trimmed,
          score: opts?.score,
          city: cityValue,
          ...(locale.country !== 'GLOBAL' ? { country: locale.countryName } : {}),
          ...(opts?.source ? { source: opts.source } : {}),
        },
      });
      setNewKeyword('');
      await plan.refresh();
    } catch (e) {
      setActionError((e as Error).message || 'Could not add the keyword. Please try again.');
    } finally {
      setAdding(false);
    }
  }

  async function addSuggestion(s: Suggestion) {
    if (addingSuggestion) return;
    setAddingSuggestion(s.keyword);
    setActionError(null);
    try {
      await apiRequest('/api/gbp/keyword-plan', {
        method: 'POST',
        body: {
          keyword: s.keyword,
          score: s.score,
          city: s.city || city.trim() || null,
          ...(locale.country !== 'GLOBAL' ? { country: locale.countryName } : {}),
          source: 'ai',
        },
      });
      await plan.refresh();
    } catch (e) {
      setActionError((e as Error).message || 'Could not add the keyword. Please try again.');
    } finally {
      setAddingSuggestion(null);
    }
  }

  async function removeKeyword(kw: TrackedKeyword) {
    if (deletingId) return;
    setDeletingId(kw.id);
    setActionError(null);
    try {
      await apiRequest(`/api/gbp/keyword-plan?id=${encodeURIComponent(kw.id)}`, { method: 'DELETE' });
      await plan.refresh();
    } catch (e) {
      Alert.alert('Could not remove keyword', (e as Error).message || 'Please try again.');
    } finally {
      setDeletingId(null);
    }
  }

  async function runSuggest() {
    const trimmed = city.trim();
    if (!trimmed) {
      setSuggestError('Enter your locality or city to search keywords.');
      return;
    }
    setSuggesting(true);
    setSuggestError(null);
    try {
      const res = await apiRequest<{ suggestions: Suggestion[] }>('/api/gbp/keyword-plan/suggest', {
        method: 'POST',
        body: { city: trimmed },
      });
      setSuggestions(res.suggestions || []);
    } catch (e) {
      setSuggestError((e as Error).message || 'Keyword search failed. Please try again.');
      setSuggestions(null);
    } finally {
      setSuggesting(false);
    }
  }

  async function runWinnabilityAnalyzer() {
    setAnalyzing(true);
    setActionError(null);
    try {
      const candidatePool = [
        ...searchTerms.slice(0, 4).map((s) => s.keyword),
        ...keywords.slice(0, 4).map((k) => k.keyword),
        ...(suggestions || []).slice(0, 3).map((s) => s.keyword),
      ].filter((kw, idx, arr) => kw && arr.findIndex((x) => x.toLowerCase() === kw.toLowerCase()) === idx);

      const res = await apiRequest<{ analyzed: WinnabilityItem[]; quickWins?: WinnabilityItem[] }>(
        '/api/gbp/keyword-plan/analyze',
        {
          method: 'POST',
          body: candidatePool.length > 0 ? { keywords: candidatePool.slice(0, 8) } : {},
        },
      );
      setAnalyzedList(res.analyzed || []);
      await plan.refresh();
    } catch (e) {
      setActionError((e as Error).message || 'Could not analyze local competition.');
    } finally {
      setAnalyzing(false);
    }
  }

  async function createLocalizedServiceFromKeyword(keyword: string) {
    if (writingServiceKw) return;
    setWritingServiceKw(keyword);
    try {
      const res = await apiRequest<{
        services?: Array<{ name: string; description: string; charCount: number }>;
        syncedToGoogle?: boolean;
      }>('/api/gbp/services/optimize', {
        method: 'POST',
        body: {
          serviceName: keyword,
          targetKeyword: keyword,
          save: true,
          pushToGoogle: true,
        },
      });
      const created = res.services?.[0];
      Alert.alert(
        '300-500 Char Service Ready',
        created
          ? `Created "${created.name}" (${created.charCount} chars)${res.syncedToGoogle ? ' & pushed to Google!' : '.'}\n\nOpen Services Studio to review.`
          : 'Localized SEO service generated.',
      );
    } catch (e) {
      Alert.alert('Service Generator', (e as Error).message || 'Could not generate service copy.');
    } finally {
      setWritingServiceKw(null);
    }
  }

  return (
    <Screen
      title="Keyword & Search Terms"
      subtitle="Real Google Search Terms, Winnable keywords & local rank insights"
      showBack={true}
      onBack={() => {
        if (router.canGoBack?.()) router.back();
        else router.replace('/(tabs)/index');
      }}
      onRefresh={plan.refresh}
    >
      <ErrorNotice message={plan.error} retry={plan.refresh} />
      <ErrorNotice message={actionError || suggestError} retry={actionError ? plan.refresh : runSuggest} />

      {/* 3-Tab Switcher */}
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {[
          { id: 'search_terms' as const, label: `Search Terms (${searchTerms.length})` },
          { id: 'winnable' as const, label: `Winnable (${winnabilityItems.length})` },
          { id: 'tracked' as const, label: `Tracked (${keywords.length})` },
        ].map((t) => {
          const active = tab === t.id;
          return (
            <Pressable
              key={t.id}
              accessibilityRole="button"
              onPress={() => setTab(t.id)}
              style={{
                flex: 1,
                paddingVertical: 10,
                paddingHorizontal: 6,
                borderRadius: 12,
                backgroundColor: active ? colors.brand : colors.surface,
                borderWidth: 1,
                borderColor: active ? colors.brand : colors.line,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 11.5, fontWeight: '800', color: active ? '#FFFFFF' : colors.ink }} numberOfLines={1}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {plan.data?.migrationRequired ? (
        <Card style={{ backgroundColor: colors.note, borderColor: colors.noteBorder }}>
          <Text style={{ fontSize: 12.5, color: colors.noteText, lineHeight: 19 }}>
            Keyword tracking storage isn't set up on the server yet. Ask your admin to apply the
            latest database update — until then keywords can't be saved.
          </Text>
        </Card>
      ) : null}

      {/* ── TAB 1: REAL GBP SEARCH TERMS ─────────────────────────────── */}
      {tab === 'search_terms' && (
        <View style={{ gap: 12 }}>
          <Card style={{ gap: 10 }}>
            <View style={[ui.row, { justifyContent: 'space-between' }]}>
              <Text style={ui.heading}>Real Google Search Queries</Text>
              <View style={{ backgroundColor: colors.brandSoft, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: colors.brandDark }}>GBP Insights</Text>
              </View>
            </View>
            <Text style={ui.caption}>
              Actual keywords people typed on Google Search &amp; Maps to discover your profile. Turn them into
              300-500 char localized services &amp; AI posts so you rank higher.
            </Text>

            {plan.loading ? (
              <ActivityIndicator color={colors.brand} style={{ padding: 20 }} />
            ) : searchTerms.length === 0 ? (
              <Empty
                title="No Google Search Terms synced yet"
                detail="Refresh your Google Business analytics from Home or switch to Winnable / Tracked to discover local searches."
              />
            ) : (
              searchTerms.map((term, idx) => {
                const isTracked = keywords.some((k) => k.keyword.toLowerCase() === term.keyword.toLowerCase());
                const busySvc = writingServiceKw === term.keyword;
                return (
                  <View
                    key={`${term.keyword}-${idx}`}
                    style={{
                      paddingVertical: 10,
                      borderBottomWidth: idx < searchTerms.length - 1 ? 1 : 0,
                      borderBottomColor: colors.line,
                      gap: 8,
                    }}
                  >
                    <View style={[ui.row, { justifyContent: 'space-between' }]}>
                      <Text style={{ flex: 1, fontSize: 13, fontWeight: '700', color: colors.ink }} numberOfLines={2}>
                        {term.keyword}
                      </Text>
                      <View style={{ backgroundColor: colors.soft, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: colors.brandDark }}>
                          {term.isThreshold ? `${term.count}+` : term.count} searches
                        </Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <Pressable
                        accessibilityRole="button"
                        disabled={isTracked || adding}
                        onPress={() => void addKeyword(term.keyword, { source: 'ai' })}
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderRadius: 8,
                          backgroundColor: isTracked ? colors.soft : colors.brandSoft,
                          borderWidth: 1,
                          borderColor: isTracked ? colors.line : colors.brand,
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '800', color: isTracked ? colors.muted : colors.brandDark }}>
                          {isTracked ? 'Tracked ✓' : '+ Track Keyword'}
                        </Text>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        disabled={Boolean(writingServiceKw)}
                        onPress={() => void createLocalizedServiceFromKeyword(term.keyword)}
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderRadius: 8,
                          backgroundColor: colors.ink,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                          opacity: busySvc ? 0.6 : 1,
                        }}
                      >
                        {busySvc ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <MaterialIcons name="auto-awesome" size={13} color="#FFFFFF" />
                        )}
                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>
                          {busySvc ? 'Writing…' : '300-500c Service'}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })
            )}
          </Card>
        </View>
      )}

      {/* ── TAB 2: WINNABLE KEYWORDS & LOCAL COMPETITION ANALYZER ──────── */}
      {tab === 'winnable' && (
        <View style={{ gap: 12 }}>
          <Card style={{ gap: 10 }}>
            <Text style={ui.heading}>Winnable Keywords (Google Places + Autocomplete)</Text>
            <Text style={ui.caption}>
              Scores local buyer queries using your real GBP search demand, Google Autocomplete intent, and top-5
              Google Places competitor strength — 100% built-in with zero extra paid API fees.
            </Text>

            <Pressable
              accessibilityRole="button"
              disabled={analyzing}
              onPress={() => void runWinnabilityAnalyzer()}
              style={({ pressed }) => ({
                minHeight: 46,
                borderRadius: 12,
                backgroundColor: colors.brand,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 6,
                opacity: analyzing ? 0.6 : pressed ? 0.85 : 1,
              })}
            >
              {analyzing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <MaterialIcons name="insights" size={18} color="#FFFFFF" />
              )}
              <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>
                {analyzing ? 'Measuring Top-5 Competitors…' : 'Analyze Local Competition'}
              </Text>
            </Pressable>
          </Card>

          {winnabilityItems.length === 0 ? (
            <Empty
              title="No keywords analyzed yet"
              detail="Tap Analyze Local Competition above to find Quick Win keywords you can outrank fast."
            />
          ) : (
            winnabilityItems.map((item) => {
              const badge = tierColors(item.winnabilityTier);
              const isTracked = keywords.some((k) => k.keyword.toLowerCase() === item.keyword.toLowerCase());
              const busySvc = writingServiceKw === item.keyword;
              return (
                <Card key={item.keyword} style={{ gap: 8 }}>
                  <View style={[ui.row, { justifyContent: 'space-between', alignItems: 'flex-start' }]}>
                    <Text style={{ flex: 1, fontSize: 13.5, fontWeight: '800', color: colors.ink, marginRight: 8 }}>
                      {item.keyword}
                    </Text>
                    <View style={{ backgroundColor: badge.bg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                      <Text style={{ fontSize: 10.5, fontWeight: '800', color: badge.fg }}>{item.winnabilityTier}</Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    <View style={{ backgroundColor: colors.soft, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                      <Text style={{ fontSize: 10.5, fontWeight: '700', color: colors.ink }}>
                        Signal: {item.demandSignal}
                      </Text>
                    </View>
                    <View style={{ backgroundColor: colors.soft, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                      <Text style={{ fontSize: 10.5, fontWeight: '700', color: colors.muted }}>
                        Competition: {item.competitionLevel}
                      </Text>
                    </View>
                    {item.yourPlacesRank != null ? (
                      <View style={{ backgroundColor: colors.brandSoft, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                        <Text style={{ fontSize: 10.5, fontWeight: '800', color: colors.brandDark }}>
                          Your Rank #{item.yourPlacesRank}
                        </Text>
                      </View>
                    ) : null}
                    {item.top3AvgReviews != null ? (
                      <View style={{ backgroundColor: colors.soft, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                        <Text style={{ fontSize: 10.5, fontWeight: '700', color: colors.muted }}>
                          Top-3 Avg: {item.top3AvgReviews} reviews
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  <Text style={{ fontSize: 11.5, color: colors.muted, lineHeight: 16 }}>{item.reason}</Text>

                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Pressable
                      disabled={isTracked || adding}
                      onPress={() => void addKeyword(item.keyword, { score: item.winnabilityScore, source: 'ai' })}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 7,
                        borderRadius: 8,
                        backgroundColor: isTracked ? colors.soft : colors.brandSoft,
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '800', color: isTracked ? colors.muted : colors.brandDark }}>
                        {isTracked ? 'Tracked ✓' : '+ Track'}
                      </Text>
                    </Pressable>
                    <Pressable
                      disabled={Boolean(writingServiceKw)}
                      onPress={() => void createLocalizedServiceFromKeyword(item.keyword)}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 7,
                        borderRadius: 8,
                        backgroundColor: colors.ink,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      {busySvc ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <MaterialIcons name="auto-awesome" size={13} color="#FFFFFF" />
                      )}
                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>
                        {busySvc ? 'Writing…' : 'Make 300-500c Service'}
                      </Text>
                    </Pressable>
                  </View>
                </Card>
              );
            })
          )}
        </View>
      )}

      {/* ── TAB 3: TRACKED & AUTOCOMPLETE DISCOVERY ───────────────────── */}
      {tab === 'tracked' && (
        <View style={{ gap: 12 }}>
          <View style={[ui.row, { justifyContent: 'space-between' }]}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: colors.ink, letterSpacing: 0.4 }}>
              ADDED KEYWORDS
            </Text>
            <Text style={ui.caption}>{keywords.length}/20</Text>
          </View>

          <Card style={{ gap: 12 }}>
            {plan.loading ? (
              <ActivityIndicator accessibilityLabel="Loading keywords" color={colors.brand} style={{ padding: 20 }} />
            ) : keywords.length === 0 ? (
              !plan.error && (
                <View style={{ gap: 10 }}>
                  <Empty
                    title="No keywords added yet"
                    detail="Pick a suggested starter keyword below or search your locality to target customer searches."
                  />
                  {starterKeywords.length > 0 ? (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {starterKeywords.map((starter) => (
                        <Pressable
                          key={starter}
                          accessibilityRole="button"
                          disabled={adding}
                          onPress={() => void addKeyword(starter, { source: 'ai' })}
                          style={({ pressed }) => ({
                            backgroundColor: colors.brandSoft,
                            borderColor: colors.brand,
                            borderWidth: 1,
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                            borderRadius: 10,
                            opacity: pressed ? 0.8 : 1,
                          })}
                        >
                          <Text style={{ fontSize: 11.5, fontWeight: '700', color: colors.brandDark }}>
                            + {starter}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  ) : null}
                </View>
              )
            ) : (
              keywords.map((kw, idx) => (
                <View
                  key={kw.id}
                  style={[
                    ui.row,
                    {
                      justifyContent: 'space-between',
                      paddingVertical: 10,
                      borderBottomWidth: idx < keywords.length - 1 ? 1 : 0,
                      borderBottomColor: colors.line,
                    },
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, marginRight: 8 }}>
                    <View style={{ width: 34, height: 34, borderRadius: 17, overflow: 'hidden' }}>
                      <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, flexDirection: 'row' }}>
                        <View style={{ flex: 1, backgroundColor: '#C084FC' }} />
                        <View style={{ flex: 1, backgroundColor: '#A855F7' }} />
                      </View>
                      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>{idx + 1}</Text>
                      </View>
                    </View>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink }} numberOfLines={2}>
                        {kw.keyword}
                      </Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                        {kw.city ? (
                          <View
                            style={{
                              backgroundColor: colors.soft,
                              paddingHorizontal: 6,
                              paddingVertical: 2,
                              borderRadius: 6,
                            }}
                          >
                            <Text style={{ fontSize: 10, fontWeight: '700', color: colors.muted }}>📍 {kw.city}</Text>
                          </View>
                        ) : null}
                        {kw.winnability ? (
                          <View
                            style={{
                              backgroundColor: tierColors(kw.winnability.winnabilityTier).bg,
                              paddingHorizontal: 6,
                              paddingVertical: 2,
                              borderRadius: 6,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 10,
                                fontWeight: '800',
                                color: tierColors(kw.winnability.winnabilityTier).fg,
                              }}
                            >
                              {kw.winnability.winnabilityTier}
                            </Text>
                          </View>
                        ) : null}
                        {kw.mapsRank != null ? (
                          <View style={{ backgroundColor: colors.brandSoft, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                            <Text style={{ fontSize: 10, fontWeight: '800', color: colors.brandDark }}>Maps #{kw.mapsRank}</Text>
                          </View>
                        ) : null}
                        {kw.organicRank != null ? (
                          <View style={{ backgroundColor: '#EFF6FF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                            <Text style={{ fontSize: 10, fontWeight: '800', color: '#1D4ED8' }}>Web #{kw.organicRank}</Text>
                          </View>
                        ) : null}
                        {kw.aiOverviewCited ? (
                          <View style={{ backgroundColor: colors.aiPurpleSoft, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                            <Text style={{ fontSize: 10, fontWeight: '800', color: colors.aiPurple }}>AI Cited</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {kw.winnability ? (
                      <View style={{ backgroundColor: colors.brandSoft, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: colors.brandDark }}>
                          Win {kw.winnability.winnabilityScore}
                        </Text>
                      </View>
                    ) : kw.score != null ? (
                      <View style={{ backgroundColor: colors.soft, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: colors.muted }}>
                          Score {kw.score}
                        </Text>
                      </View>
                    ) : null}
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Remove keyword ${kw.keyword}`}
                      disabled={deletingId === kw.id}
                      onPress={() => void removeKeyword(kw)}
                      hitSlop={8}
                      style={{ padding: 4, opacity: deletingId === kw.id ? 0.4 : 1 }}
                    >
                      {deletingId === kw.id ? (
                        <ActivityIndicator size="small" color={colors.danger} />
                      ) : (
                        <MaterialIcons name="close" size={18} color={colors.danger} />
                      )}
                    </Pressable>
                  </View>
                </View>
              ))
            )}

            {/* + Add Keyword (POST) */}
            <View style={{ gap: 8 }}>
              <Text style={ui.label}>+ Add Keyword</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <TextInput
                    accessibilityLabel="New keyword"
                    placeholder="e.g. emergency dentist near me"
                    placeholderTextColor={colors.muted}
                    value={newKeyword}
                    onChangeText={setNewKeyword}
                    autoCapitalize="none"
                    style={[ui.input, { minHeight: 46 }]}
                    onSubmitEditing={() => void addKeyword(newKeyword)}
                  />
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Add keyword"
                  disabled={adding || plan.loading}
                  onPress={() => void addKeyword(newKeyword)}
                  style={({ pressed }) => ({
                    minWidth: 64,
                    minHeight: 46,
                    borderRadius: 12,
                    backgroundColor: colors.brand,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 12,
                    opacity: adding ? 0.5 : pressed ? 0.85 : 1,
                  })}
                >
                  {adding ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>Add</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </Card>

          {/* ── KEYWORD DISCOVERY (Autocomplete + Search Terms + AI) ────── */}
          <Text style={{ fontSize: 13, fontWeight: '800', color: colors.ink, letterSpacing: 0.4 }}>
            DISCOVER BUYER KEYWORDS
          </Text>

          <Card style={{ gap: 12 }}>
            <View style={[ui.row, { justifyContent: 'space-between' }]}>
              <Text style={ui.label}>Target Region</Text>
              <View style={{ backgroundColor: colors.soft, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.ink }}>
                  {locale.flag} {locale.countryName}
                </Text>
              </View>
            </View>

            <View style={{ gap: 6 }}>
              <Text style={ui.label}>Locality / City</Text>
              <TextInput
                accessibilityLabel="Locality or city for keyword search"
                placeholder="Enter your city or neighborhood"
                placeholderTextColor={colors.muted}
                value={city}
                onChangeText={setCity}
                style={[ui.input, { minHeight: 46 }]}
                onSubmitEditing={() => void runSuggest()}
              />
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Search keywords for this city"
              disabled={suggesting}
              onPress={() => void runSuggest()}
              style={({ pressed }) => ({
                minHeight: 48,
                borderRadius: 12,
                backgroundColor: colors.ink,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 6,
                opacity: suggesting ? 0.6 : pressed ? 0.85 : 1,
              })}
            >
              {suggesting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <MaterialIcons name="search" size={17} color="#FFFFFF" />
              )}
              <Text style={{ color: '#FFFFFF', fontSize: 13.5, fontWeight: '700' }}>
                {suggesting ? 'Searching…' : 'Search Google Suggest & AI'}
              </Text>
            </Pressable>

            {suggestions != null && !suggesting ? (
              suggestions.length === 0 ? (
                <Text style={[ui.caption, { textAlign: 'center', paddingVertical: 8 }]}>
                  No suggestions for this city yet — try a nearby larger city.
                </Text>
              ) : (
                <View style={{ gap: 8 }}>
                  <Text style={ui.label}>Suggestions for {city.trim()}</Text>
                  {suggestions.map((s) => {
                    const added = keywords.some((k) => k.keyword.toLowerCase() === s.keyword.toLowerCase());
                    return (
                      <View
                        key={s.keyword}
                        style={[
                          ui.row,
                          {
                            justifyContent: 'space-between',
                            borderWidth: 1,
                            borderColor: colors.line,
                            borderRadius: 12,
                            padding: 10,
                          },
                        ]}
                      >
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.ink }}>{s.keyword}</Text>
                          <Text style={{ fontSize: 10.5, color: colors.muted, marginTop: 2 }}>
                            {s.demandSignal ||
                              (s.sourceTag === 'gbp_search'
                                ? 'Real GBP Search Term'
                                : s.sourceTag === 'google_suggest'
                                  ? 'Google Autocomplete'
                                  : 'Local Buyer Intent')}
                          </Text>
                        </View>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Add keyword ${s.keyword}`}
                          disabled={added || addingSuggestion === s.keyword}
                          onPress={() => void addSuggestion(s)}
                          style={({ pressed }) => ({
                            minHeight: 36,
                            paddingHorizontal: 12,
                            borderRadius: 10,
                            backgroundColor: added ? colors.soft : colors.brand,
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: added ? 1 : pressed ? 0.85 : 1,
                          })}
                        >
                          {addingSuggestion === s.keyword ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <Text style={{ color: added ? colors.brand : '#FFFFFF', fontSize: 12, fontWeight: '700' }}>
                              {added ? 'Added ✓' : '+ Add'}
                            </Text>
                          )}
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              )
            ) : null}
          </Card>
        </View>
      )}
    </Screen>
  );
}
