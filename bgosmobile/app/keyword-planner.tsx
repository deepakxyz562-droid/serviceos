import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Card, Empty, ErrorNotice, Screen, colors, ui } from '../src/components/ui';
import { useResource } from '../src/hooks/use-resource';
import { apiRequest } from '../src/lib/api';

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
  source: string;
};

type KeywordPlanResponse = {
  keywords: TrackedKeyword[];
  suggestedStarterKeywords?: string[];
  locale?: { country: string; countryName: string; flag: string };
  defaultCity?: string | null;
  migrationRequired: boolean;
};

type Suggestion = { keyword: string; score: number; city: string | null };

/**
 * Keyword Planner:
 *  - ADDED KEYWORDS: ranked tracked list from GET /api/gbp/keyword-plan with
 *    delete (DELETE ?id=), manual add (POST), starter keyword chips, and live Maps/Web rank badges.
 *  - KEYWORD SEARCH: Dynamic workspace locale + Locality/City → POST /api/gbp/keyword-plan/suggest
 */
export default function KeywordPlannerScreen() {
  const router = useRouter();
  const plan = useResource<KeywordPlanResponse>('/api/gbp/keyword-plan');

  const [newKeyword, setNewKeyword] = useState('');
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [city, setCity] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [addingSuggestion, setAddingSuggestion] = useState<string | null>(null);

  const keywords = plan.data?.keywords || [];
  const starterKeywords = plan.data?.suggestedStarterKeywords || [];
  const locale = plan.data?.locale || { country: 'GLOBAL', countryName: 'Local Market', flag: '🌍' };

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

  return (
    <Screen
      title="Keyword Planner"
      subtitle="Rank for the searches your local customers actually type"
      showBack={true}
      onBack={() => {
        if (router.canGoBack?.()) router.back();
        else router.replace('/(tabs)/index');
      }}
      onRefresh={plan.refresh}
    >
      <ErrorNotice message={plan.error} retry={plan.refresh} />
      <ErrorNotice message={actionError || suggestError} retry={actionError ? plan.refresh : runSuggest} />

      {plan.data?.migrationRequired ? (
        <Card style={{ backgroundColor: colors.note, borderColor: colors.noteBorder }}>
          <Text style={{ fontSize: 12.5, color: colors.noteText, lineHeight: 19 }}>
            Keyword tracking storage isn't set up on the server yet. Ask your admin to apply the
            latest database update — until then keywords can't be saved.
          </Text>
        </Card>
      ) : null}

      {/* ── ADDED KEYWORDS ─────────────────────────────────────────── */}
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
                {kw.score != null ? (
                  <View style={{ backgroundColor: colors.brandSoft, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: colors.brandDark }}>
                      {kw.score}/mo
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
              {adding ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>Add</Text>}
            </Pressable>
          </View>
        </View>
      </Card>

      {/* ── KEYWORD SEARCH ─────────────────────────────────────────── */}
      <Text style={{ fontSize: 13, fontWeight: '800', color: colors.ink, letterSpacing: 0.4 }}>
        KEYWORD SEARCH
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
            {suggesting ? 'Searching…' : 'Search Keywords'}
          </Text>
        </Pressable>

        {suggestions != null && !suggesting ? (
          suggestions.length === 0 ? (
            <Text style={[ui.caption, { textAlign: 'center', paddingVertical: 8 }]}>
              No suggestions for this city yet — try a nearby larger city.
            </Text>
          ) : (
            <View style={{ gap: 8 }}>
              <Text style={ui.label}>AI-suggested for {city.trim()}</Text>
              {suggestions.map((s) => {
                const added = keywords.some((k) => k.keyword === s.keyword.toLowerCase());
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
                        ~{s.score} searches/mo
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
    </Screen>
  );
}
