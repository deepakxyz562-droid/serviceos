import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, Switch, Text, TextInput, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { Action, Card, ErrorNotice, Field, Loading, colors, ui } from '../ui';
import { apiRequest } from '../../lib/api';
import { getToken } from '../../lib/auth';
import { WEB_URL } from '../../lib/constants';
import { loadJson, saveJson, removeItem } from '../../lib/device-storage';
import { gbpColors, Pill, StarRow } from './bits';
import { WEEK_DAYS, type GbpPlaceResult, type KeywordsResult, type WeekHours } from './types';

/** AsyncStorage-style wizard resume key (persisted via the app's device-storage layer). */
const WIZARD_KEY = 'bgos_gbp_wizard_v1';
/** Overflow key for the keyword/hours payload (keeps each SecureStore value < 2KB). */
const WIZARD_KW_KEY = 'bgos_gbp_wizard_v1_kw';

export type WizardStep = 1 | 2 | 3 | 4 | 5;

export type WizardState = {
  step: WizardStep;
  offerings: string[];
  about: string;
  offeringsSaved: boolean;
  aboutSaved: boolean;
  keywordsSaved: boolean;
  hoursSaved: boolean;
  completedAt: string | null;
};

export type WizardExtra = {
  keywords: string[];
  customKeywords: string[];
  hours: WeekHours;
};

export const WIZARD_STEPS: { n: WizardStep; label: string }[] = [
  { n: 1, label: 'Connect' },
  { n: 2, label: 'Location' },
  { n: 3, label: 'About' },
  { n: 4, label: 'GBP Info' },
  { n: 5, label: 'Done' },
];

const FRESH_STATE: WizardState = {
  step: 1,
  offerings: [],
  about: '',
  offeringsSaved: false,
  aboutSaved: false,
  keywordsSaved: false,
  hoursSaved: false,
  completedAt: null,
};

const DEFAULT_HOURS: WeekHours = Object.fromEntries(
  WEEK_DAYS.map((day) => [
    day,
    day === 'Saturday' || day === 'Sunday'
      ? { open: false, openTime: '09:00', closeTime: '17:00' }
      : { open: true, openTime: '09:00', closeTime: '17:00' },
  ]),
) as WeekHours;

/**
 * Loads + persists wizard progress (resume across launches).
 * Exposed as a hook so the GBP tab controls visibility from real state.
 */
export function useWizardState() {
  const [state, setState] = useState<WizardState | null>(null);
  const [extra, setExtra] = useState<WizardExtra>({ keywords: [], customKeywords: [], hours: DEFAULT_HOURS });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const [savedState, savedExtra] = await Promise.all([
        loadJson<WizardState>(WIZARD_KEY),
        loadJson<WizardExtra>(WIZARD_KW_KEY),
      ]);
      if (!active) return;
      if (savedState && typeof savedState.step === 'number') {
        setState({ ...FRESH_STATE, ...savedState, step: clampStep(savedState.step) });
      }
      if (savedExtra) {
        setExtra((prev) => ({
          keywords: Array.isArray(savedExtra.keywords) ? savedExtra.keywords.slice(0, 30) : prev.keywords,
          customKeywords: Array.isArray(savedExtra.customKeywords) ? savedExtra.customKeywords.slice(0, 10) : [],
          hours: savedExtra.hours && typeof savedExtra.hours === 'object' ? { ...prev.hours, ...savedExtra.hours } : prev.hours,
        }));
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const update = useCallback((patch: Partial<WizardState>) => {
    setState((prev) => {
      const next: WizardState = { ...FRESH_STATE, ...(prev || {}), ...patch };
      void saveJson(WIZARD_KEY, next);
      return next;
    });
  }, []);

  const updateExtra = useCallback((patch: Partial<WizardExtra>) => {
    setExtra((prev) => {
      const next = { ...prev, ...patch };
      void saveJson(WIZARD_KW_KEY, next);
      return next;
    });
  }, []);

  const reset = useCallback(async () => {
    setState(null);
    setExtra({ keywords: [], customKeywords: [], hours: DEFAULT_HOURS });
    await removeItem(WIZARD_KEY);
    await removeItem(WIZARD_KW_KEY);
  }, []);

  return { state, extra, loading, update, updateExtra, reset };
}

function clampStep(step: number): WizardStep {
  if (step <= 1) return 1;
  if (step >= 5) return 5;
  return step as WizardStep;
}

/** Simple multicolor "Google" wordmark (per-letter brand colors). */
function GoogleWordmark({ size = 22 }: { size?: number }) {
  const letters: [string, string][] = [
    ['G', '#4285F4'],
    ['o', '#EA4335'],
    ['o', '#FBBC05'],
    ['g', '#4285F4'],
    ['l', '#34A853'],
    ['e', '#EA4335'],
  ];
  return (
    <View style={{ flexDirection: 'row' }}>
      {letters.map(([ch, col], i) => (
        <Text key={i} style={{ fontSize: size, fontWeight: '800', color: col }}>
          {ch}
        </Text>
      ))}
    </View>
  );
}

const BENEFITS: { icon: React.ComponentProps<typeof MaterialIcons>['name']; title: string; detail: string }[] = [
  { icon: 'chat-bubble-outline', title: 'AI review replies', detail: 'Every Google review answered with SEO-rich replies' },
  { icon: 'auto-awesome', title: 'Auto posts', detail: '1-2 SEO posts published to your profile every week' },
  { icon: 'photo-library', title: 'Photo publishing', detail: 'Bulk photos drip-published on an AI schedule' },
  { icon: 'insights', title: 'Weekly analytics', detail: 'Views, calls and directions in a weekly summary' },
];

const MAX_KEYWORDS = 10;

/** Controller returned by useWizardState — owned by the parent tab screen. */
export type WizardController = ReturnType<typeof useWizardState>;

/**
 * 5-step GBP connect wizard (design spec §2-§4):
 * Connect → Location → About → GBP Info → Done.
 * Progress persists (`bgos_gbp_wizard_v1`) so the flow resumes after the
 * OAuth hop or an app restart. Steps 2+ require a connected profile —
 * when not connected the wizard always clamps back to step 1.
 */
export function ConnectWizard({
  wizard,
  place,
  placeLoading,
  connecting,
  onConnect,
  onProfileSaved,
  onFinish,
  businessName,
}: {
  wizard: WizardController;
  place: GbpPlaceResult | null;
  placeLoading: boolean;
  connecting: boolean;
  onConnect: () => Promise<void>;
  /** Called after offerings/about/hours are pushed so the parent can resync. */
  onProfileSaved: () => Promise<void>;
  /** Fired from step 5 "Go to GBP Dashboard" — parent switches to the timeline view. */
  onFinish: () => void;
  businessName: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const connected = Boolean(place?.isConnected);

  // Auto-advance: OAuth returned and the place is live → move to Location.
  useEffect(() => {
    if (connected && wizard.state && wizard.state.step === 1 && !wizard.loading) {
      wizard.update({ step: 2 });
    }
  }, [connected, wizard.loading, wizard.state, wizard.update]);

  if (wizard.loading) return <Loading />;

  const step: WizardStep = connected ? clampStep(wizard.state?.step || 2) : 1;

  return (
    <View style={{ gap: 14 }}>
      <Stepper current={step} />
      <ErrorNotice message={error} retry={() => setError(null)} />

      {step === 1 ? (
        <StepConnect connecting={connecting} onConnect={onConnect} connected={connected} />
      ) : null}
      {step === 2 ? (
        <StepLocation place={place} placeLoading={placeLoading} businessName={businessName} onNext={() => wizard.update({ step: 3 })} />
      ) : null}
      {step === 3 ? (
        <StepAbout
          place={place}
          businessName={businessName}
          wizard={wizard}
          saving={saving}
          setSaving={setSaving}
          setError={setError}
          onProfileSaved={onProfileSaved}
          onBack={() => wizard.update({ step: 2 })}
        />
      ) : null}
      {step === 4 ? (
        <StepGbpInfo
          place={place}
          businessName={businessName}
          wizard={wizard}
          saving={saving}
          setSaving={setSaving}
          setError={setError}
          onProfileSaved={onProfileSaved}
          onBack={() => wizard.update({ step: 3 })}
        />
      ) : null}
      {step === 5 ? (
        <StepDone
          wizard={wizard}
          place={place}
          businessName={businessName}
          onGoToDashboard={async () => {
            wizard.update({ step: 5, completedAt: new Date().toISOString() });
            onFinish();
          }}
          onResetWizard={wizard.reset}
        />
      ) : null}
    </View>
  );
}

function Stepper({ current }: { current: WizardStep }) {
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={`Wizard step ${current} of 5`}
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.line,
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 10,
      }}
    >
      {WIZARD_STEPS.map((s, i) => {
        const done = s.n < current || (s.n === 5 && current === 5);
        const active = s.n === current;
        return (
          <View key={s.n} style={{ alignItems: 'center', flex: 1, gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%' }}>
              {i > 0 ? (
                <View
                  style={{
                    flex: 1,
                    height: 0,
                    borderTopWidth: 2,
                    borderTopColor: s.n <= current ? colors.brand : colors.line,
                    borderStyle: 'dashed',
                  }}
                />
              ) : (
                <View style={{ flex: 0.001 }} />
              )}
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  borderWidth: active ? 2 : 0,
                  borderColor: colors.brand,
                  padding: 1,
                  backgroundColor: done ? gbpColors.emerald : active ? colors.surface : colors.background,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {done && s.n !== 5 ? (
                  <MaterialIcons name="check" size={18} color="#FFFFFF" />
                ) : done ? (
                  <MaterialIcons name="celebration" size={16} color="#FFFFFF" />
                ) : (
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '800',
                      color: active ? colors.brand : colors.muted,
                    }}
                  >
                    {s.n}
                  </Text>
                )}
              </View>
              {i < WIZARD_STEPS.length - 1 ? (
                <View style={{ flex: 1, height: 0, borderTopWidth: 2, borderTopColor: colors.line, borderStyle: 'dashed' }} />
              ) : (
                <View style={{ flex: 0.001 }} />
              )}
            </View>
            <Text
              style={{
                fontSize: 11,
                fontWeight: active || done ? '700' : '500',
                color: active ? colors.brand : done ? gbpColors.emerald : colors.muted,
              }}
              numberOfLines={1}
            >
              {s.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/* ── Step 1 · Connect ──────────────────────────────────────────────────── */

function StepConnect({
  connecting,
  onConnect,
  connected,
}: {
  connecting: boolean;
  onConnect: () => Promise<void>;
  connected: boolean;
}) {
  return (
    <Card style={{ gap: 14 }}>
      <View style={{ alignItems: 'center', gap: 10, paddingVertical: 6 }}>
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 18,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.line,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 6,
            elevation: 2,
          }}
        >
          <Text style={{ fontSize: 34, fontWeight: '800', color: '#4285F4' }}>G</Text>
        </View>
        <Text style={{ fontSize: 19, fontWeight: '800', color: colors.ink, textAlign: 'center' }}>
          Connect your Google Business Profile
        </Text>
        <GoogleWordmark size={16} />
        <Text style={{ fontSize: 13, lineHeight: 19, color: colors.muted, textAlign: 'center' }}>
          Put your business on Google Maps — AI handles replies, posts, photos and analytics after a one-time sign-in.
        </Text>
      </View>

      <View style={{ gap: 10 }}>
        {BENEFITS.map((b) => (
          <View key={b.title} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
            <View style={[ui.iconTile, { width: 36, height: 36, borderRadius: 10 }]}>
              <MaterialIcons name={b.icon} size={18} color={colors.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13.5, fontWeight: '700', color: colors.ink }}>{b.title}</Text>
              <Text style={{ fontSize: 12, lineHeight: 17, color: colors.muted }}>{b.detail}</Text>
            </View>
          </View>
        ))}
      </View>

      {connected ? (
        <Action label="Continue" icon="arrow-forward" onPress={() => void onConnect()} disabled />
      ) : (
        <Action label={connecting ? 'Opening Google…' : 'Connect with Google'} icon="login" onPress={() => void onConnect()} disabled={connecting} />
      )}
      <Text style={{ fontSize: 11, color: colors.muted, textAlign: 'center' }}>
        Secure Google sign-in · you stay in control of your account
      </Text>
    </Card>
  );
}

/* ── Step 2 · Location ─────────────────────────────────────────────────── */

function StepLocation({
  place,
  placeLoading,
  businessName,
  onNext,
}: {
  place: GbpPlaceResult | null;
  placeLoading: boolean;
  businessName: string;
  onNext: () => void;
}) {
  const p = place?.place;
  const rating = place?.metrics?.avgRating || 0;
  const reviews = place?.metrics?.totalReviews || 0;
  return (
    <Card style={{ gap: 12 }}>
      <View style={{ alignItems: 'center', gap: 8 }}>
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: colors.brandSoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MaterialIcons name="storefront" size={28} color={colors.brand} />
          <View
            style={{
              position: 'absolute',
              right: -2,
              bottom: -2,
              width: 22,
              height: 22,
              borderRadius: 11,
              backgroundColor: gbpColors.emerald,
              borderWidth: 2,
              borderColor: colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MaterialIcons name="check" size={12} color="#FFFFFF" />
          </View>
        </View>
        <Text style={{ fontSize: 16, fontWeight: '800', color: colors.ink, textAlign: 'center' }}>
          Google Business Profile Connected Successfully!
        </Text>
      </View>

      {placeLoading ? (
        <Loading />
      ) : (
        <View
          style={{
            borderWidth: 1,
            borderColor: colors.line,
            borderRadius: 12,
            padding: 16,
            gap: 8,
            backgroundColor: colors.surface,
          }}
        >
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            <Pill label="✓ GBP Connected" bg={gbpColors.emeraldSoft} color={gbpColors.emerald} />
            {p?.isVerified ? <Pill label="✓ Verified" bg={colors.brandSoft} color={colors.brandDark} /> : null}
          </View>
          <Text style={{ fontSize: 17, fontWeight: '800', color: colors.ink }}>{businessName}</Text>
          {rating > 0 && reviews > 0 ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink }}>{rating.toFixed(1)}</Text>
              <StarRow rating={rating} size={13} />
              <Text style={{ fontSize: 12, color: colors.muted }}>({reviews} Reviews)</Text>
            </View>
          ) : null}
          {p?.address ? <Text style={{ fontSize: 13, color: colors.muted }}>{p.address}</Text> : null}
          {p?.category ? (
            <View style={{ alignSelf: 'flex-start', backgroundColor: colors.soft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: colors.brandDark }}>{p.category}</Text>
            </View>
          ) : null}
          {p?.mapsUrl ? (
            <Pressable
              accessibilityRole="link"
              onPress={() => Linking.openURL(p.mapsUrl!).catch(() => {})}
              hitSlop={6}
            >
              <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.brand }}>View on Google Maps →</Text>
            </Pressable>
          ) : null}
        </View>
      )}

      <Action label="Next" icon="arrow-forward" onPress={onNext} />
    </Card>
  );
}

/* ── Step 3 · About (offerings + description) ──────────────────────────── */

function StepAbout({
  place,
  businessName,
  wizard,
  saving,
  setSaving,
  setError,
  onProfileSaved,
  onBack,
}: {
  place: GbpPlaceResult | null;
  businessName: string;
  wizard: ReturnType<typeof useWizardState>;
  saving: boolean;
  setSaving: (v: boolean) => void;
  setError: (v: string | null) => void;
  onProfileSaved: () => Promise<void>;
  onBack: () => void;
}) {
  const state = wizard.state || FRESH_STATE;
  const [offeringInput, setOfferingInput] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);

  const category = place?.place?.category || place?.tenantFallback?.category || '';
  // Honest labeling: suggestions are derived locally from the connected Google
  // category (the keywords endpoint returns search keywords, not offerings).
  const suggestions = useMemo(() => {
    if (!category) return [];
    return category
      .split(/[/,&-]/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 3)
      .slice(0, 6);
  }, [category]);

  useEffect(() => {
    setAiSuggestions(suggestions.filter((s) => !state.offerings.includes(s)));
  }, [suggestions, state.offerings]);

  function addOffering(value: string) {
    const v = value.trim().slice(0, 60);
    if (!v || state.offerings.includes(v) || state.offerings.length >= 12) return;
    wizard.update({ offerings: [...state.offerings, v], offeringsSaved: false });
    setAiSuggestions((prev) => prev.filter((s) => s !== v));
  }

  function removeOffering(v: string) {
    wizard.update({ offerings: state.offerings.filter((o) => o !== v), offeringsSaved: false });
  }

  async function saveAndNext() {
    setSaving(true);
    setError(null);
    try {
      const industry = category || 'Local Services';
      if (state.offerings.length > 0) {
        await apiRequest('/api/brand-profile', {
          method: 'PUT',
          body: { businessName, industry, services: state.offerings, skipAiSummary: true },
        });
      }
      let aboutMessage: string | null = null;
      if (state.about.trim().length >= 30) {
        const res = await apiRequest<{ success: boolean; pushedToGoogle?: boolean; message?: string }>(
          '/api/gbp/keywords',
          { method: 'PUT', body: { description: state.about.trim().slice(0, 750), pushToGoogle: true } },
        );
        aboutMessage = res.message || null;
      }
      wizard.update({ offeringsSaved: true, aboutSaved: true, step: 4 });
      await onProfileSaved();
      Alert.alert('Profile Saved ✓', aboutMessage || 'Your offerings and business description were saved.');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not save your business profile. Please retry.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card style={{ gap: 14 }}>
      <View style={{ gap: 4 }}>
        <Text style={{ fontSize: 17, fontWeight: '800', color: colors.ink }}>About your business</Text>
        <Text style={{ fontSize: 12.5, lineHeight: 18, color: colors.muted }}>
          Offerings and a keyword-rich description help Google match you to nearby searches.
        </Text>
      </View>

      {/* Offerings */}
      <View style={{ gap: 8 }}>
        <Text style={ui.label}>
          Add Offerings <Text style={{ color: colors.danger }}>*</Text>
        </Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Field
              label=""
              placeholder="e.g. AC repair, deep cleaning, tax filing"
              value={offeringInput}
              onChangeText={setOfferingInput}
              onSubmitEditing={() => {
                addOffering(offeringInput);
                setOfferingInput('');
              }}
              style={{ minHeight: 48 }}
            />
          </View>
          <View style={{ minWidth: 76 }}>
            <Action
              label="Add"
              onPress={() => {
                addOffering(offeringInput);
                setOfferingInput('');
              }}
            />
          </View>
        </View>

        {state.offerings.length > 0 ? (
          <View style={{ gap: 6 }}>
            <Text style={ui.caption}>Selected Offerings ({state.offerings.length})</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {state.offerings.map((o) => (
                <View
                  key={o}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    minHeight: 36,
                    paddingLeft: 12,
                    paddingRight: 6,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: colors.brand,
                    backgroundColor: colors.brandSoft,
                  }}
                >
                  <Text style={{ color: colors.brandDark, fontSize: 12.5, fontWeight: '700' }}>{o}</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${o}`}
                    onPress={() => removeOffering(o)}
                    hitSlop={8}
                    style={{ padding: 4 }}
                  >
                    <MaterialIcons name="close" size={14} color={colors.brandDark} />
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {aiSuggestions.length > 0 ? (
          <View style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <MaterialIcons name="auto-awesome" size={13} color={gbpColors.ai} />
              <Text style={{ fontSize: 12.5, fontWeight: '800', color: gbpColors.aiDark }}>✨ AI Suggested</Text>
              <Text style={{ fontSize: 11, color: colors.muted }}>from your Google category</Text>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {aiSuggestions.map((s) => (
                <Pressable
                  key={s}
                  accessibilityRole="button"
                  accessibilityLabel={`Add suggested offering ${s}`}
                  onPress={() => addOffering(s)}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 5,
                    minHeight: 36,
                    paddingLeft: 12,
                    paddingRight: 10,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: gbpColors.aiBorder,
                    backgroundColor: gbpColors.aiSoft,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <MaterialIcons name="add" size={13} color={gbpColors.aiDark} />
                  <Text style={{ color: gbpColors.aiDark, fontSize: 12.5, fontWeight: '700' }}>{s}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}
      </View>

      {/* About Business */}
      <Field
        label="About Business"
        placeholder={`Describe ${businessName} — services, service area, what makes you the best choice… (450-700 characters recommended)`}
        value={state.about}
        onChangeText={(t) => wizard.update({ about: t.slice(0, 750), aboutSaved: false })}
        multiline
        style={{ minHeight: 120 }}
      />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={ui.caption}>Saved with your BGOS profile & pushed to Google.</Text>
        <Text style={[ui.caption, { color: state.about.length > 700 ? colors.danger : colors.muted }]}>
          {state.about.length}/750
        </Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ minWidth: 96 }}>
          <Action label="Back" secondary onPress={onBack} />
        </View>
        <View style={{ flex: 1 }}>
          <Action
            label={saving ? 'Saving…' : 'Save & Next'}
            icon="arrow-forward"
            onPress={() => void saveAndNext()}
            disabled={saving}
          />
        </View>
      </View>
    </Card>
  );
}

/* ── Step 4 · GBP Info (keywords + hours) ──────────────────────────────── */

function StepGbpInfo({
  place,
  businessName,
  wizard,
  saving,
  setSaving,
  setError,
  onProfileSaved,
  onBack,
}: {
  place: GbpPlaceResult | null;
  businessName: string;
  wizard: ReturnType<typeof useWizardState>;
  saving: boolean;
  setSaving: (v: boolean) => void;
  setError: (v: string | null) => void;
  onProfileSaved: () => Promise<void>;
  onBack: () => void;
}) {
  const state = wizard.state || FRESH_STATE;
  const extra = wizard.extra;
  const [loadingKeywords, setLoadingKeywords] = useState(false);
  const [keywordsLoaded, setKeywordsLoaded] = useState(extra.keywords.length > 0);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [hoursTouched, setHoursTouched] = useState(false);

  const selected = useMemo(
    () => [...extra.keywords, ...extra.customKeywords],
    [extra.keywords, extra.customKeywords],
  );

  const generateKeywords = useCallback(async () => {
    setLoadingKeywords(true);
    setError(null);
    try {
      const res = await apiRequest<KeywordsResult>('/api/gbp/keywords', {
        method: 'POST',
        body: {
          businessName,
          industry: place?.place?.category || place?.tenantFallback?.category || 'Local Services',
          location: place?.place?.address || place?.tenantFallback?.address || '',
        },
      });
      const words = (res.keywords || []).map((k) => k.keyword).filter(Boolean).slice(0, 14);
      wizard.updateExtra({ keywords: words });
      setKeywordsLoaded(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not generate AI keywords. Please retry.');
    } finally {
      setLoadingKeywords(false);
    }
  }, [businessName, place, wizard.updateExtra, setError]);

  function toggleKeyword(word: string) {
    const isCustom = extra.customKeywords.includes(word);
    if (selected.includes(word)) {
      wizard.updateExtra(
        isCustom
          ? { customKeywords: extra.customKeywords.filter((k) => k !== word) }
          : { keywords: extra.keywords.filter((k) => k !== word) },
      );
    } else {
      if (selected.length >= MAX_KEYWORDS) {
        Alert.alert('Keyword limit reached', `You can add up to ${MAX_KEYWORDS} keywords. Remove one first.`);
        return;
      }
      wizard.updateExtra(
        isCustom
          ? { customKeywords: [...extra.customKeywords, word] }
          : { keywords: [...extra.keywords, word] },
      );
    }
  }

  function addCustom() {
    const v = customInput.trim().slice(0, 60);
    if (!v) return;
    if (selected.includes(v)) {
      setCustomInput('');
      return;
    }
    if (selected.length >= MAX_KEYWORDS) {
      Alert.alert('Keyword limit reached', `You can add up to ${MAX_KEYWORDS} keywords. Remove one first.`);
      return;
    }
    wizard.updateExtra({ customKeywords: [...extra.customKeywords, v] });
    setCustomInput('');
  }

  function setHours(day: string, patch: Partial<{ open: boolean; openTime: string; closeTime: string }>) {
    setHoursTouched(true);
    wizard.updateExtra({
      hours: { ...extra.hours, [day]: { ...extra.hours[day], ...patch } },
    });
  }

  async function saveAndNext() {
    setSaving(true);
    setError(null);
    try {
      if (hoursTouched) {
        const industry = place?.place?.category || place?.tenantFallback?.category || 'Local Services';
        await apiRequest('/api/brand-profile', {
          method: 'PUT',
          body: { businessName, industry, hours: JSON.stringify(extra.hours), skipAiSummary: true },
        });
        await onProfileSaved();
      }
      wizard.update({ keywordsSaved: true, hoursSaved: hoursTouched || state.hoursSaved, step: 5 });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not save business hours. Please retry.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card style={{ gap: 14 }}>
      <View style={{ gap: 4 }}>
        <Text style={{ fontSize: 17, fontWeight: '800', color: colors.ink }}>GBP Info</Text>
        <Text style={{ fontSize: 12.5, lineHeight: 18, color: colors.muted }}>
          Pick the search keywords AI should rank you for, and confirm your opening hours.
        </Text>
      </View>

      {/* Keywords */}
      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 14, fontWeight: '800', color: colors.ink }}>Add Keywords</Text>
          <Text style={{ fontSize: 12, fontWeight: '800', color: colors.brand }}>
            {selected.length} of {MAX_KEYWORDS} Added
          </Text>
        </View>

        {!keywordsLoaded ? (
          <View style={{ gap: 10 }}>
            <Text style={ui.caption}>
              ✨ AI suggests high-intent local search phrases customers actually type into Google.
            </Text>
            <AiSuggestButton loading={loadingKeywords} onPress={() => void generateKeywords()} />
          </View>
        ) : (
          <>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {[
                ...extra.keywords.map((word) => ({ word, isCustom: false })),
                ...extra.customKeywords.map((word) => ({ word, isCustom: true })),
              ].map(({ word, isCustom }) => {
                const isOn = selected.includes(word);
                return (
                  <Pressable
                    key={`${isCustom ? 'custom' : 'ai'}-${word}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isOn }}
                    accessibilityLabel={`Keyword ${word}${isOn ? ', selected' : ''}`}
                    onPress={() => toggleKeyword(word)}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                      minHeight: 36,
                      paddingHorizontal: 12,
                      borderRadius: 20,
                      borderWidth: 1,
                      borderColor: isOn ? colors.brand : colors.line,
                      backgroundColor: isOn ? colors.brandSoft : colors.surface,
                      opacity: pressed ? 0.75 : 1,
                    })}
                  >
                    {isCustom ? <MaterialIcons name="person" size={11} color={isOn ? colors.brandDark : colors.muted} /> : null}
                    <Text
                      style={{
                        color: isOn ? colors.brandDark : colors.muted,
                        fontSize: 12.5,
                        fontWeight: isOn ? '700' : '500',
                      }}
                    >
                      {word}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View
              style={{
                backgroundColor: colors.background,
                borderRadius: 10,
                padding: 12,
                gap: 8,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.ink }}>
                  Not happy with the AI keyword suggestions?
                </Text>
                <Pressable accessibilityRole="button" onPress={() => setSuggestOpen(!suggestOpen)} hitSlop={6}>
                  <Text style={{ fontSize: 12.5, fontWeight: '800', color: colors.brand }}>
                    {suggestOpen ? 'Hide' : 'Suggest Your Own'}
                  </Text>
                </Pressable>
              </View>
              {suggestOpen ? (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Field
                      label=""
                      placeholder="e.g. emergency plumber near Austin"
                      value={customInput}
                      onChangeText={setCustomInput}
                      onSubmitEditing={addCustom}
                    />
                  </View>
                  <View style={{ minWidth: 76 }}>
                    <Action label="Add" onPress={addCustom} />
                  </View>
                </View>
              ) : null}
            </View>
            <Text style={ui.caption}>
              Keywords are saved with your wizard profile and steer AI posts and review replies.
            </Text>
          </>
        )}
      </View>

      {/* Hours */}
      <View style={{ gap: 8 }}>
        <Text style={{ fontSize: 14, fontWeight: '800', color: colors.ink }}>Business Hours</Text>
        <View style={{ gap: 6 }}>
          {WEEK_DAYS.map((day) => {
            const h = extra.hours[day];
            if (!h) return null;
            return (
              <View
                key={day}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  paddingVertical: 6,
                }}
              >
                <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: colors.ink }}>{day}</Text>
                {h.open ? (
                  <>
                    <TextInput
                      accessibilityLabel={`${day} opening time`}
                      value={h.openTime}
                      onChangeText={(t) => setHours(day, { openTime: t.slice(0, 5) })}
                      placeholder="09:00"
                      style={[ui.input, { minHeight: 38, width: 78, paddingVertical: 6, fontSize: 13 }]}
                    />
                    <Text style={{ color: colors.muted, fontSize: 12 }}>–</Text>
                    <TextInput
                      accessibilityLabel={`${day} closing time`}
                      value={h.closeTime}
                      onChangeText={(t) => setHours(day, { closeTime: t.slice(0, 5) })}
                      placeholder="17:00"
                      style={[ui.input, { minHeight: 38, width: 78, paddingVertical: 6, fontSize: 13 }]}
                    />
                  </>
                ) : (
                  <Text style={{ fontSize: 12, color: colors.muted, width: 178, textAlign: 'center' }}>Closed</Text>
                )}
                <Switch
                  accessibilityLabel={`${day} open`}
                  value={h.open}
                  onValueChange={(v) => setHours(day, { open: v })}
                  trackColor={{ true: colors.brand, false: colors.line }}
                  thumbColor="#FFFFFF"
                />
              </View>
            );
          })}
        </View>
        <Text style={ui.caption}>Hours are saved to your BGOS brand profile — connect data drives local ranking.</Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ minWidth: 96 }}>
          <Action label="Back" secondary onPress={onBack} />
        </View>
        <View style={{ flex: 1 }}>
          <Action label={saving ? 'Saving…' : 'Save keywords & Next'} icon="arrow-forward" onPress={() => void saveAndNext()} disabled={saving} />
        </View>
      </View>
    </Card>
  );
}

function AiSuggestButton({ loading, onPress }: { loading: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: loading }}
      disabled={loading}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: gbpColors.ai,
        borderRadius: 12,
        minHeight: 48,
        paddingHorizontal: 16,
        opacity: loading ? 0.6 : pressed ? 0.85 : 1,
      })}
    >
      {loading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <MaterialIcons name="auto-awesome" size={16} color="#FFFFFF" />}
      <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700' }}>
        {loading ? 'Generating keywords…' : '✨ Generate AI Keywords'}
      </Text>
    </Pressable>
  );
}

/* ── Step 5 · Done ─────────────────────────────────────────────────────── */

function StepDone({
  wizard,
  place,
  businessName,
  onGoToDashboard,
  onResetWizard,
}: {
  wizard: ReturnType<typeof useWizardState>;
  place: GbpPlaceResult | null;
  businessName: string;
  onGoToDashboard: () => void;
  onResetWizard: () => Promise<void>;
}) {
  const state = wizard.state || FRESH_STATE;
  const extra = wizard.extra;
  const keywordCount = extra.keywords.length + extra.customKeywords.length;
  const hoursCount = WEEK_DAYS.filter((d) => extra.hours[d]?.open).length;

  const rows: { icon: React.ComponentProps<typeof MaterialIcons>['name']; label: string; value: string; ok: boolean }[] = [
    { icon: 'storefront', label: 'Google Business Profile', value: place?.place?.isVerified ? 'Connected & verified' : 'Connected', ok: true },
    { icon: 'inventory-2', label: 'Offerings added', value: state.offeringsSaved ? `${state.offerings.length} saved` : 'Skipped', ok: state.offeringsSaved },
    { icon: 'notes', label: 'Business description', value: state.aboutSaved ? `${state.about.length} characters saved` : 'Skipped', ok: state.aboutSaved },
    { icon: 'tag', label: 'SEO keywords', value: keywordCount > 0 ? `${keywordCount} selected` : 'Skipped', ok: keywordCount > 0 },
    { icon: 'schedule', label: 'Business hours', value: hoursCount > 0 ? `${hoursCount} open days set` : 'Default hours', ok: true },
  ];

  return (
    <Card style={{ gap: 14 }}>
      <View style={{ alignItems: 'center', gap: 8 }}>
        <View
          style={{
            width: 60,
            height: 60,
            borderRadius: 30,
            backgroundColor: gbpColors.emeraldSoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MaterialIcons name="celebration" size={30} color={gbpColors.emerald} />
        </View>
        <Text style={{ fontSize: 18, fontWeight: '800', color: colors.ink }}>Setup complete 🎉</Text>
        <Text style={{ fontSize: 13, lineHeight: 19, color: colors.muted, textAlign: 'center' }}>
          {businessName} is ready. AI starts optimizing your profile, replying to reviews and publishing posts.
        </Text>
      </View>

      <View style={{ gap: 0, borderWidth: 1, borderColor: colors.line, borderRadius: 12, overflow: 'hidden' }}>
        {rows.map((r, i) => (
          <View
            key={r.label}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              paddingHorizontal: 12,
              paddingVertical: 11,
              borderTopWidth: i === 0 ? 0 : 1,
              borderTopColor: colors.line,
              backgroundColor: colors.surface,
            }}
          >
            <MaterialIcons name={r.icon} size={17} color={r.ok ? gbpColors.emerald : colors.muted} />
            <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: colors.ink }}>{r.label}</Text>
            <Text style={{ fontSize: 12, fontWeight: '700', color: r.ok ? gbpColors.emerald : colors.muted }}>
              {r.value}
            </Text>
          </View>
        ))}
      </View>

      <Action label="Go to GBP Dashboard" icon="space-dashboard" onPress={onGoToDashboard} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Run setup wizard again"
        onPress={() => void onResetWizard()}
        hitSlop={8}
        style={{ alignSelf: 'center' }}
      >
        <Text style={{ fontSize: 12, fontWeight: '600', color: colors.muted }}>Run setup again</Text>
      </Pressable>
    </Card>
  );
}
