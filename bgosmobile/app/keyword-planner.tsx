import React, { useState } from 'react';
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
  source: string;
};

type KeywordPlanResponse = { keywords: TrackedKeyword[]; migrationRequired: boolean };
type Suggestion = { keyword: string; score: number; city: string | null };

/**
 * Keyword Planner (Dhanda AI benchmark, non-tab route):
 *  - ADDED KEYWORDS: ranked tracked list from GET /api/gbp/keyword-plan with
 *    delete (DELETE ?id=) and manual add (POST).
 *  - KEYWORD SEARCH: Locality/City → POST /api/gbp/keyword-plan/suggest
 *    returns AI local-SEO suggestions with volume bands; each row adds itself
 *    to the tracked list.
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

  async function addKeyword(keyword: string, opts?: { score?: number; city?: string | null }) {
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
          country: 'India',
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
          country: 'India',
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
            bgos_dhanda_redesign migration — until then keywords can't be saved.
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
            <Empty
              title="No keywords added yet"
              detail="Add your first local keyword below — AI posts will target these searches on your Google Profile."
            />
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
                {/* Gradient rank circle (two-tone purple, no extra deps) */}
                <View style={{ width: 34, height: 34, borderRadius: 17, overflow: 'hidden' }}>
                  <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, flexDirection: 'row' }}>
                    <View style={{ flex: 1, backgroundColor: '#C084FC' }} />
                    <View style={{ flex: 1, backgroundColor: '#A855F7' }} />
                  </View>
                  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>{idx + 1}</Text>
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink }} numberOfLines={2}>
                    {kw.keyword}
                  </Text>
                  {kw.city ? (
                    <View
                      style={{
                        alignSelf: 'flex-start',
                        marginTop: 3,
                        backgroundColor: colors.soft,
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderRadius: 6,
                      }}
                    >
                      <Text style={{ fontSize: 10, fontWeight: '700', color: colors.muted }}>📍 {kw.city}</Text>
                    </View>
                  ) : null}
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
                placeholder="e.g. best plumber in indiranagar"
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
        {/* Country fixed to India for the local-SEO planner */}
        <View style={[ui.row, { justifyContent: 'space-between' }]}>
          <Text style={ui.label}>Country</Text>
          <View style={{ backgroundColor: colors.soft, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.ink }}>🇮🇳 India</Text>
          </View>
        </View>

        <View style={{ gap: 6 }}>
          <Text style={ui.label}>Locality / City</Text>
          <TextInput
            accessibilityLabel="Locality or city for keyword search"
            placeholder="e.g. Indiranagar, Bangalore"
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
