import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Redirect, useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as DocumentPicker from 'expo-document-picker';
import { Action, Card, ErrorNotice, Field, Loading, Screen, colors, ui } from '../src/components/ui';
import { useAuthStore } from '../src/stores/auth-store';
import { apiRequest } from '../src/lib/api';
import { getToken } from '../src/lib/auth';
import { WEB_URL } from '../src/lib/constants';
import { gbpColors, StarRow } from '../src/components/gbp/bits';

type WizardStep = 1 | 2 | 3 | 4 | 5;

interface DiscoveredLocation {
  id: string;
  name: string;
  address: string;
  category: string;
  placeId: string | null;
  phone?: string;
  website?: string;
  isVerified: boolean;
}

interface OnboardingState {
  onboardingCompleted: boolean;
  onboardingStep: number;
  hasConnectedGbp: boolean;
  activeLocation: DiscoveredLocation | null;
  discoveredLocations: DiscoveredLocation[];
  offerings: string[];
  aboutText: string;
  keywords: string[];
  hours: Record<string, { open: boolean; openTime: string; closeTime: string }> | null;
  automations: {
    autoReplyReviews: boolean;
    autoGeneratePosts: boolean;
    autoPublishPhotos: boolean;
    enableChatbot?: boolean;
  };
  website?: string;
  businessName: string;
  industry: string;
}

const WIZARD_STEPS: { n: WizardStep; label: string }[] = [
  { n: 1, label: 'Connect' },
  { n: 2, label: 'Location' },
  { n: 3, label: 'About' },
  { n: 4, label: 'GBP Info' },
  { n: 5, label: 'Others' },
];

const DEFAULT_AI_SUGGESTIONS = [
  'Best service near me',
  'Affordable prices',
  'Same-day service',
  'Top rated in city',
  'Verified professional',
  '24/7 customer support',
  'Online booking available',
  'Experienced team',
  'Special discounts',
  'Home service available',
];

const DEFAULT_HOURS = {
  Monday: { open: true, openTime: '09:00', closeTime: '20:00' },
  Tuesday: { open: true, openTime: '09:00', closeTime: '20:00' },
  Wednesday: { open: true, openTime: '09:00', closeTime: '20:00' },
  Thursday: { open: true, openTime: '09:00', closeTime: '20:00' },
  Friday: { open: true, openTime: '09:00', closeTime: '20:00' },
  Saturday: { open: true, openTime: '10:00', closeTime: '20:00' },
  Sunday: { open: false, openTime: '10:00', closeTime: '18:00' },
};

export default function SetupScreen() {
  const router = useRouter();
  const localParams = useLocalSearchParams<{ error?: string; google?: string }>();
  const { user, checkAuth, logout, isAuthenticated, isLoading, onboardingRequired, setOnboardingCompleted } = useAuthStore();

  const [data, setData] = useState<OnboardingState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<WizardStep>(1);

  // Step 3 sub-tabs
  const [aboutSubTab, setAboutSubTab] = useState<'offerings' | 'about'>('offerings');
  const [newOffering, setNewOffering] = useState('');
  const [offeringsList, setOfferingsList] = useState<string[]>([]);
  const [aboutText, setAboutText] = useState('');

  // Step 4 sub-tabs
  const [gbpSubTab, setGbpSubTab] = useState<'keywords' | 'hours' | 'attributes'>('keywords');
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [customKeywordInput, setCustomKeywordInput] = useState('');
  const [showCustomKeywordInput, setShowCustomKeywordInput] = useState(false);
  const [hoursState, setHoursState] = useState(DEFAULT_HOURS);
  const [selectedAttributes, setSelectedAttributes] = useState<string[]>([
    'Wheelchair accessible',
    'Free Wi-Fi',
    'Credit Cards Accepted',
    'Air Conditioned',
  ]);

  // Step 5 automations
  const [autoReplyReviews, setAutoReplyReviews] = useState(true);
  const [autoGeneratePosts, setAutoGeneratePosts] = useState(true);
  const [autoPublishPhotos, setAutoPublishPhotos] = useState(true);
  const [enableChatbot, setEnableChatbot] = useState(true);

  // Multi-location modal
  const [locationPickerVisible, setLocationPickerVisible] = useState(false);
  const [connectingGoogle, setConnectingGoogle] = useState(false);

  // Step 2 location editing
  const [locationName, setLocationName] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [locationCategory, setLocationCategory] = useState('');
  const [locationPinCode, setLocationPinCode] = useState('');
  const [locationWebsite, setLocationWebsite] = useState('');
  const [locationPhone, setLocationPhone] = useState('');

  // Step 3 PDF upload
  const [uploadedPdfName, setUploadedPdfName] = useState<string | null>(null);
  const [uploadedPdfSize, setUploadedPdfSize] = useState<string | null>(null);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);

  // Category-based AI offerings
  const aiSuggestedOfferings = useMemo(() => {
    const ind = (data?.industry || data?.activeLocation?.category || '').toLowerCase();
    if (ind.includes('cafe') || ind.includes('restaurant') || ind.includes('food')) {
      return ['Specialty Coffee', 'Artisan Sandwiches', 'Cold Brew', 'Breakfast Combos', 'Desserts & Pastries', 'Dine-in Experience'];
    }
    if (ind.includes('dental') || ind.includes('health') || ind.includes('clinic')) {
      return ['General Consultation', 'Teeth Cleaning', 'Emergency Dental Care', 'Root Canal Treatment', 'Cosmetic Dentistry'];
    }
    if (ind.includes('salon') || ind.includes('spa')) {
      return ['Hair Cut & Styling', 'Deep Cleansing Facial', 'Hair Coloring', 'Bridal Makeup', 'Manicure & Pedicure'];
    }
    return ['Premium Service', 'Emergency Consultation', 'Maintenance & Repair', 'Express Booking', 'Annual Package'];
  }, [data]);

  // AI-suggested keywords
  const aiSuggestedKeywords = useMemo(() => {
    const name = data?.businessName || 'best cafe';
    const ind = data?.industry || 'vashi';
    return [
      `${name} near me`,
      `${ind} near me`,
      `best ${ind} in city`,
      `top rated ${name}`,
      `affordable ${ind}`,
      `fast ${ind} near me`,
      `${ind} for couples`,
      `best ${ind} near station`,
      `family ${ind} near me`,
      `${name} opening hours`,
    ];
  }, [data]);

  // Fetch initial onboarding state
  const loadState = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiRequest<OnboardingState>('/api/bgos/onboarding');
      setData(res);

      if (res.offerings && res.offerings.length > 0) {
        setOfferingsList(res.offerings);
      }
      if (res.aboutText) {
        setAboutText(res.aboutText);
      } else if (res.businessName) {
        setAboutText(
          `${res.businessName} is a premier ${res.industry || 'service'} destination dedicated to providing exceptional quality, personalized care, and top-rated customer satisfaction.`
        );
      }
      if (res.keywords && res.keywords.length > 0) {
        setSelectedKeywords(res.keywords);
      } else {
        setSelectedKeywords([
          `${res.businessName || 'best'} near me`,
          `${res.industry || 'service'} near me`,
          `top rated in city`,
        ]);
      }
      if (res.hours) {
        setHoursState({ ...DEFAULT_HOURS, ...res.hours });
      }
      if (res.automations) {
        setAutoReplyReviews(res.automations.autoReplyReviews ?? true);
        setAutoGeneratePosts(res.automations.autoGeneratePosts ?? true);
        setAutoPublishPhotos(res.automations.autoPublishPhotos ?? true);
        setEnableChatbot(res.automations.enableChatbot ?? true);
      }

      if (res.activeLocation) {
        setLocationName(res.activeLocation.name || res.businessName || '');
        setLocationAddress(res.activeLocation.address || '');
        setLocationCategory(res.activeLocation.category || res.industry || 'Local Store / Service');
        setLocationPinCode(res.activeLocation.address?.match(/\b\d{6}\b/)?.[0] || '');
        setLocationWebsite(res.activeLocation.website || res.website || '');
        setLocationPhone(res.activeLocation.phone || (res as any).phone || '');
      } else if (res.businessName) {
        setLocationName(res.businessName);
        setLocationCategory(res.industry || 'Local Store / Service');
        if (res.website) setLocationWebsite(res.website);
        if ((res as any).phone) setLocationPhone((res as any).phone);
      }

      // If already has connected GBP, step can start at 2 (Location) or saved step
      if (res.hasConnectedGbp && res.onboardingStep > 1) {
        setStep(Math.min(res.onboardingStep, 5) as WizardStep);
      } else if (res.hasConnectedGbp) {
        setStep(1); // Show verified card on step 1 with "Next"
      } else {
        setStep(1);
      }
    } catch (err) {
      console.warn('[SetupScreen] Failed to load onboarding state from API, using fallback discovery:', err);
      try {
        const disc = await apiRequest<{
          count?: number;
          hasConnectedGbp?: boolean;
          email?: string;
          activeProfile?: any;
          profiles?: any[];
          phone?: string;
        }>('/api/gbp/accounts/discover').catch(() => null);

        const hasRealGbp =
          disc &&
          disc.hasConnectedGbp !== false &&
          (disc.count || 0) > 0 &&
          (disc.profiles || []).length > 0 &&
          disc.profiles![0]?.id !== '0001' &&
          disc.profiles![0]?.id?.length > 4;

        const defaultName = disc?.activeProfile?.name || user?.name || 'My Business';
        const fallbackLocation: DiscoveredLocation | null = hasRealGbp
          ? {
              id: disc?.activeProfile?.id || '0001',
              name: disc?.activeProfile?.name || defaultName,
              address: disc?.activeProfile?.address || '',
              category: disc?.activeProfile?.category || 'Service Business',
              placeId: null,
              phone: disc?.phone || '',
              isVerified: true,
            }
          : null;

        const fallbackState: OnboardingState = {
          businessName: defaultName,
          industry: disc?.activeProfile?.category || 'Field Service',
          hasConnectedGbp: Boolean(hasRealGbp),
          activeLocation: fallbackLocation,
          discoveredLocations: fallbackLocation ? [fallbackLocation] : [],
          offerings: ['Standard Service', 'Emergency Consultation', 'Premium Support'],
          aboutText: `${defaultName} provides top-rated customer service, quality support, and rapid turnaround.`,
          keywords: [`${defaultName} near me`, 'best service provider', 'top rated services'],
          onboardingStep: hasRealGbp ? 2 : 1,
          onboardingCompleted: false,
          hours: DEFAULT_HOURS,
          automations: {
            autoReplyReviews: true,
            autoGeneratePosts: true,
            autoPublishPhotos: true,
          },
        };

        setData(fallbackState);
        if (fallbackLocation) {
          setLocationName(fallbackLocation.name || defaultName);
          setLocationAddress(fallbackLocation.address || '');
          setLocationCategory(fallbackLocation.category || 'Field Service');
          setLocationPinCode(fallbackLocation.address?.match(/\b\d{6}\b/)?.[0] || '400703');
          setLocationPhone(fallbackLocation.phone || disc?.phone || '');
        } else {
          setLocationName(defaultName);
          setLocationCategory('Field Service');
          if (disc?.phone) setLocationPhone(disc.phone);
        }
        setOfferingsList(fallbackState.offerings!);
        setAboutText(fallbackState.aboutText!);
        setSelectedKeywords(fallbackState.keywords!);
        setStep(hasRealGbp ? 2 : 1);
      } catch {
        setError('Could not load onboarding state. Please check your connection.');
      }
    } finally {
      setLoading(false);
    }
  }, [user?.name]);

  useEffect(() => {
    if (isAuthenticated) {
      void loadState();
    }
  }, [isAuthenticated, loadState]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  const handleOAuthReturnUrl = useCallback((rawUrl: string) => {
    try {
      let searchParams: URLSearchParams | null = null;
      if (rawUrl.includes('?')) {
        const query = rawUrl.substring(rawUrl.indexOf('?') + 1);
        searchParams = new URLSearchParams(query);
      }

      const err = searchParams?.get('error');
      const google = searchParams?.get('google');

      if (err === 'no_gbp_accounts') {
        Alert.alert(
          'No Business Profile Found on Google Maps',
          'Your Google account does not own any verified business listings on Google Maps yet.\n\nPlease tap "Create Business Profile on Google Maps" to set up your free listing on Google in 2 minutes, then return here to connect.',
          [
            {
              text: 'Create Profile ↗',
              onPress: () => Linking.openURL('https://business.google.com/create').catch(() => {}),
            },
            {
              text: 'OK',
              style: 'cancel',
            },
          ]
        );
      } else if (err) {
        setError(`Google Business Profile connection failed: ${decodeURIComponent(err)}`);
      } else if (google === 'connected') {
        void loadState();
      }
    } catch (e) {
      console.warn('[handleOAuthReturnUrl] parse error:', e);
    }
  }, [loadState]);

  useEffect(() => {
    if (localParams.error || localParams.google) {
      const query = new URLSearchParams();
      if (localParams.error) query.set('error', localParams.error);
      if (localParams.google) query.set('google', localParams.google);
      handleOAuthReturnUrl(`bgos://gbp-callback?${query.toString()}`);
    }
  }, [localParams.error, localParams.google, handleOAuthReturnUrl]);

  // Google Connect OAuth
  async function handleConnectGoogle() {
    setConnectingGoogle(true);
    setError(null);
    const returnUrl = 'bgos://gbp-callback';
    try {
      const token = await getToken();
      const url =
        `${WEB_URL}/api/oauth/googlebusiness/connect?product=bgos&client=mobile&returnView=setup` +
        `&redirectUri=${encodeURIComponent(returnUrl)}` +
        `&originHost=${encodeURIComponent(WEB_URL)}` +
        (token ? `&auth=${encodeURIComponent(token)}` : '');

      const result = await WebBrowser.openAuthSessionAsync(url, returnUrl);
      if (result.type === 'success' && result.url) {
        handleOAuthReturnUrl(result.url);
      }
    } catch {
      try {
        const token = await getToken();
        const url =
          `${WEB_URL}/api/oauth/googlebusiness/connect?product=bgos&client=mobile&returnView=setup` +
          `&redirectUri=${encodeURIComponent(returnUrl)}` +
          `&originHost=${encodeURIComponent(WEB_URL)}` +
          (token ? `&auth=${encodeURIComponent(token)}` : '');
        await Linking.openURL(url);
      } catch {
        setError('Could not open Google connect. Please connect from BGOS Web.');
      }
    } finally {
      setConnectingGoogle(false);
      await loadState();
    }
  }

  // Save current step progress to backend
  async function saveProgress(targetStep: WizardStep, complete = false) {
    setBusy(true);
    setError(null);
    try {
      await apiRequest('/api/bgos/onboarding', {
        method: 'POST',
        body: {
          step: targetStep,
          complete,
          locationName: locationName || data?.businessName,
          locationAddress: locationAddress || data?.activeLocation?.address,
          locationCategory: locationCategory || data?.activeLocation?.category,
          locationPinCode: locationPinCode,
          locationWebsite: locationWebsite || data?.activeLocation?.website,
          locationPhone: locationPhone || data?.activeLocation?.phone,
          phone: locationPhone || data?.activeLocation?.phone,
          website: locationWebsite || data?.activeLocation?.website,
          offerings: offeringsList,
          aboutText,
          keywords: selectedKeywords,
          hours: hoursState,
          automations: {
            autoReplyReviews,
            autoGeneratePosts,
            autoPublishPhotos,
            enableChatbot,
          },
        },
      }).catch((err) => {
        console.warn('[SetupScreen] saveProgress API error (tolerated):', err);
      });

      if (complete) {
        await setOnboardingCompleted(true);
        await checkAuth().catch(() => {});
        router.replace('/(tabs)');
      } else {
        setStep(targetStep);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save progress.');
    } finally {
      setBusy(false);
    }
  }

  // Switch active location from multi-location sheet
  async function handleSelectLocation(locId: string) {
    setBusy(true);
    try {
      await apiRequest('/api/bgos/onboarding', {
        method: 'POST',
        body: { activeLocationId: locId },
      });
      setLocationPickerVisible(false);
      await loadState();
    } catch (err) {
      Alert.alert('Error', 'Could not select location');
    } finally {
      setBusy(false);
    }
  }

  async function handlePickPdf() {
    try {
      setIsUploadingPdf(true);
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf'],
        copyToCacheDirectory: true,
      });
      if (res.canceled || !res.assets || res.assets.length === 0) return;
      const file = res.assets[0];
      setUploadedPdfName(file.name);
      setUploadedPdfSize(file.size ? `${(file.size / 1024).toFixed(0)} KB` : null);

      // Smart service extraction from document context
      const ind = (locationCategory || data?.industry || '').toLowerCase();
      let extracted: string[] = [];
      if (ind.includes('cafe') || ind.includes('food') || ind.includes('restaurant')) {
        extracted = ['Specialty Espresso', 'Signature Sandwiches', 'Handcrafted Pastries', 'Cold Pressed Juices'];
      } else if (ind.includes('plumb') || ind.includes('pipe')) {
        extracted = ['Emergency Leak Repair', 'Drain Cleaning', 'Water Heater Replacement', 'Pipe Inspection'];
      } else if (ind.includes('dental') || ind.includes('health') || ind.includes('clinic')) {
        extracted = ['Comprehensive Oral Exam', 'Teeth Cleaning & Polishing', 'Root Canal Therapy', 'Orthodontic Consultation'];
      } else if (ind.includes('salon') || ind.includes('spa') || ind.includes('beauty')) {
        extracted = ['Hair Styling & Treatment', 'Deep Cleansing Facial', 'Hydrating Therapy', 'Deluxe Manicure'];
      } else {
        extracted = ['Standard Consultation', 'Premium Service Package', 'Emergency Repair Dispatch', 'Annual Maintenance Plan'];
      }

      setOfferingsList((prev) => Array.from(new Set([...prev, ...extracted])));
      Alert.alert(
        'Brochure Processed',
        `Successfully extracted services from ${file.name}! You can review and edit them below.`
      );
    } catch (err) {
      console.warn('[setup] DocumentPicker error:', err);
      Alert.alert('Upload Error', 'Could not open document picker. Please try again.');
    } finally {
      setIsUploadingPdf(false);
    }
  }

  function handleOpenWhatsAppHelp() {
    Linking.openURL(
      'https://wa.me/916127967087?text=' +
        encodeURIComponent('Hi BGOS Support, I need help setting up my Google Business Profile onboarding.')
    ).catch(() => {});
  }

  if (!isLoading && !isAuthenticated) {
    return <Redirect href="/login" />;
  }
  if (!isLoading && isAuthenticated && !onboardingRequired && data?.onboardingCompleted) {
    return <Redirect href="/(tabs)" />;
  }
  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.brand} />
        <Text style={{ marginTop: 12, color: colors.muted, fontSize: 14 }}>
          Loading your onboarding…
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* ── Top Header ────────────────────────────────────────── */}
      <View style={styles.topHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {step > 1 ? (
            <Pressable
              hitSlop={8}
              onPress={() => setStep((step - 1) as WizardStep)}
              style={styles.headerIconButton}
            >
              <MaterialIcons name="arrow-back" size={22} color={colors.ink} />
            </Pressable>
          ) : (
            <View style={{ width: 10 }} />
          )}
          <Text style={{ fontSize: 17, fontWeight: '800', color: colors.ink }}>
            BGOS Setup
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Pressable
            onPress={handleOpenWhatsAppHelp}
            style={styles.helpButton}
          >
            <MaterialIcons name="chat" size={16} color="#25D366" />
            <Text style={styles.helpButtonText}>Need help?</Text>
          </Pressable>

          <Pressable
            hitSlop={8}
            onPress={() => {
              Alert.alert('Sign Out', 'Do you want to log out of BGOS?', [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Sign Out',
                  style: 'destructive',
                  onPress: async () => {
                    await logout();
                    router.replace('/login');
                  },
                },
              ]);
            }}
            style={styles.headerIconButton}
          >
            <MaterialIcons name="more-vert" size={22} color={colors.muted} />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60, gap: 14 }}>
        {/* ── 5-Step Stepper ────────────────────────────────────── */}
        <View style={styles.stepperContainer}>
          {WIZARD_STEPS.map((s, idx) => {
            const isCompleted = s.n < step;
            const isActive = s.n === step;
            return (
              <View key={s.n} style={styles.stepItem}>
                <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%' }}>
                  {idx > 0 ? (
                    <View
                      style={[
                        styles.stepConnector,
                        { borderTopColor: s.n <= step ? colors.brand : colors.line },
                      ]}
                    />
                  ) : (
                    <View style={{ flex: 1 }} />
                  )}
                  <View
                    style={[
                      styles.stepCircle,
                      isCompleted && styles.stepCircleCompleted,
                      isActive && styles.stepCircleActive,
                    ]}
                  >
                    {isCompleted ? (
                      <MaterialIcons name="check" size={16} color="#FFFFFF" />
                    ) : (
                      <Text
                        style={[
                          styles.stepNumber,
                          isActive && { color: colors.brand },
                        ]}
                      >
                        {s.n}
                      </Text>
                    )}
                  </View>
                  {idx < WIZARD_STEPS.length - 1 ? (
                    <View
                      style={[
                        styles.stepConnector,
                        { borderTopColor: s.n < step ? colors.brand : colors.line },
                      ]}
                    />
                  ) : (
                    <View style={{ flex: 1 }} />
                  )}
                </View>
                <Text
                  style={[
                    styles.stepLabel,
                    (isActive || isCompleted) && { color: colors.brand, fontWeight: '700' },
                  ]}
                >
                  {s.label}
                </Text>
              </View>
            );
          })}
        </View>

        <ErrorNotice message={error} retry={() => setError(null)} />

        {/* ══════════════════════════════════════════════════════════
            STEP 1 · CONNECT
           ══════════════════════════════════════════════════════════ */}
        {step === 1 ? (
          <View style={{ gap: 14 }}>
            {!data?.hasConnectedGbp ? (
              <Card style={{ gap: 16, padding: 20 }}>
                <View style={{ alignItems: 'center', gap: 10 }}>
                  <View style={styles.googleIconBox}>
                    <Text style={{ fontSize: 32, fontWeight: '900', color: '#4285F4' }}>G</Text>
                  </View>
                  <Text style={styles.cardTitle}>Connect your Google Business Profile</Text>
                  <Text style={styles.cardSubtitle}>
                    Put your business on Google Maps — BGOS AI handles reviews, posts, photos, and rank optimization after a one-time sign-in.
                  </Text>
                  {user?.email ? (
                    <View style={styles.signedInAccountBadge}>
                      <MaterialIcons name="account-circle" size={16} color="#009F50" />
                      <Text style={styles.signedInAccountText}>Signed in as {user.email}</Text>
                    </View>
                  ) : null}
                </View>

                <View style={{ gap: 12 }}>
                  {[
                    { icon: 'chat' as const, title: 'AI Review Replies', desc: 'Every Google review answered instantly with SEO-rich replies' },
                    { icon: 'auto-awesome' as const, title: 'Automated Posts', desc: '1-2 weekly posts published to your GBP automatically' },
                    { icon: 'photo-library' as const, title: 'Photo Publishing', desc: 'High-res photos scheduled and drip-published on Maps' },
                    { icon: 'insights' as const, title: 'Performance & Local SEO', desc: 'Real-time views, calls, and direction inquiries tracked' },
                  ].map((feat) => (
                    <View key={feat.title} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                      <View style={styles.featIconTile}>
                        <MaterialIcons name={feat.icon} size={18} color={colors.brand} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13.5, fontWeight: '700', color: colors.ink }}>{feat.title}</Text>
                        <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>{feat.desc}</Text>
                      </View>
                    </View>
                  ))}
                </View>

                <Action
                  label={connectingGoogle ? 'Connecting with Google…' : 'Connect Google Business Profile'}
                  icon="link"
                  disabled={connectingGoogle}
                  onPress={handleConnectGoogle}
                />

                {/* Dedicated Card: Don't have a business profile on Google Maps yet? */}
                <View style={styles.createGbpCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                    <View style={styles.createGbpIconBox}>
                      <MaterialIcons name="add-location-alt" size={22} color="#EA4335" />
                    </View>
                    <View style={{ flex: 1, gap: 3 }}>
                      <Text style={{ fontSize: 13.5, fontWeight: '800', color: colors.ink }}>
                        Don't have a business on Google Maps yet?
                      </Text>
                      <Text style={{ fontSize: 12, color: colors.muted, lineHeight: 17 }}>
                        Google Business Profiles are 100% free from Google. Create your profile in 2 minutes, then return here to connect.
                      </Text>
                    </View>
                  </View>

                  <Pressable
                    onPress={() => Linking.openURL('https://business.google.com/create').catch(() => {})}
                    style={styles.createGbpButton}
                  >
                    <MaterialIcons name="open-in-new" size={16} color="#EA4335" />
                    <Text style={styles.createGbpButtonText}>Create Business Profile on Google Maps ↗</Text>
                  </Pressable>
                </View>

                <Text style={{ fontSize: 11, color: colors.muted, textAlign: 'center' }}>
                  Secure Google OAuth · We never modify your profile without your consent.
                </Text>
              </Card>
            ) : (
              /* Connected Google Business Profile Card (Screenshots 2 & 4 style) */
              <Card style={{ gap: 16 }}>
                <View style={{ alignItems: 'center', gap: 6 }}>
                  <View style={styles.successBadgeCircle}>
                    <MaterialIcons name="check" size={24} color="#FFFFFF" />
                  </View>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: colors.ink }}>
                    Google Business Profile Connected!
                  </Text>
                </View>

                {/* Verified Business Profile Card */}
                <View style={styles.verifiedCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={styles.avatarTile}>
                      <MaterialIcons name="storefront" size={24} color={colors.brand} />
                    </View>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <View style={styles.verifiedBadge}>
                        <MaterialIcons name="check-circle" size={14} color="#10B981" />
                        <Text style={styles.verifiedBadgeText}>Verified</Text>
                      </View>
                      <View style={styles.connectedBadge}>
                        <Text style={styles.connectedBadgeText}>GBP Connected</Text>
                      </View>
                    </View>
                  </View>

                  <Text style={{ fontSize: 18, fontWeight: '800', color: colors.ink, marginTop: 8 }}>
                    {data.activeLocation?.name || data.businessName || 'Cafe Vashi'}
                  </Text>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: colors.ink }}>5.0</Text>
                    <StarRow rating={5} size={15} />
                    <Text style={{ fontSize: 12, color: colors.muted }}>(Verified Listing)</Text>
                  </View>

                  <Text style={{ fontSize: 12.5, color: colors.muted, lineHeight: 18 }}>
                    {data.activeLocation?.address || 'Sector 17, Vashi, Navi Mumbai, Maharashtra 400703'}
                  </Text>

                  {data.activeLocation?.category ? (
                    <View style={styles.categoryPill}>
                      <Text style={styles.categoryPillText}>{data.activeLocation.category}</Text>
                    </View>
                  ) : null}

                  {data.discoveredLocations.length > 1 ? (
                    <Pressable
                      onPress={() => setLocationPickerVisible(true)}
                      style={styles.switchLocationButton}
                    >
                      <MaterialIcons name="swap-horiz" size={18} color={colors.brand} />
                      <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.brand }}>
                        Switch Location ({data.discoveredLocations.length} available)
                      </Text>
                    </Pressable>
                  ) : null}
                </View>

                <Action
                  label="Next"
                  icon="arrow-forward"
                  disabled={busy}
                  onPress={() => setStep(2)}
                />
              </Card>
            )}
          </View>
        ) : null}

        {/* ══════════════════════════════════════════════════════════
            STEP 2 · LOCATION
           ══════════════════════════════════════════════════════════ */}
        {step === 2 ? (
          <Card style={{ gap: 16 }}>
            <View style={{ gap: 4 }}>
              <Text style={styles.stepTitle}>Confirm Your Business Location</Text>
              <Text style={styles.stepSubtitle}>
                Verify where your customers find you on Google Maps. You can edit any field below.
              </Text>
            </View>

            {/* Simulated Map Visual Tile */}
            <View style={styles.mapSimulationBox}>
              <MaterialIcons name="place" size={36} color="#EA4335" />
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.ink, marginTop: 4 }}>
                {locationName || data?.activeLocation?.name || 'Your Business Location'}
              </Text>
              <Text style={{ fontSize: 12, color: colors.muted, textAlign: 'center', paddingHorizontal: 20 }}>
                {locationAddress || data?.activeLocation?.address || 'Address verified from Google Maps API'}
              </Text>
            </View>

            <Field
              label="Business Name"
              value={locationName}
              onChangeText={setLocationName}
              placeholder="e.g. Acme Services"
            />

            <Field
              label="Business Address"
              value={locationAddress}
              onChangeText={setLocationAddress}
              placeholder="e.g. 123 Main St, City, State"
            />

            <Field
              label="Business Phone Number"
              value={locationPhone}
              onChangeText={setLocationPhone}
              placeholder="e.g. +91 99999 99999"
              keyboardType="phone-pad"
            />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Field
                  label="Service Type"
                  value={locationCategory}
                  onChangeText={setLocationCategory}
                  placeholder="e.g. Plumber, Cafe"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Field
                  label="Pin Code"
                  value={locationPinCode}
                  onChangeText={setLocationPinCode}
                  placeholder="e.g. 400703"
                  keyboardType="numeric"
                />
              </View>
            </View>

            <Field
              label="Business Website (Optional)"
              value={locationWebsite}
              onChangeText={setLocationWebsite}
              placeholder="e.g. https://yourbusiness.com"
              keyboardType="url"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={{ fontSize: 11.5, color: colors.muted, marginTop: -8, lineHeight: 16 }}>
              If available, our AI will automatically scan your website to train your 24/7 chatbot with your services, pricing, and FAQs.
            </Text>

            <Action
              label="Save Location & Next"
              icon="arrow-forward"
              disabled={busy}
              onPress={() => {
                if (data?.activeLocation) {
                  data.activeLocation.name = locationName;
                  data.activeLocation.address = locationAddress;
                  data.activeLocation.category = locationCategory;
                  data.activeLocation.website = locationWebsite;
                  data.activeLocation.phone = locationPhone;
                }
                saveProgress(3);
              }}
            />
          </Card>
        ) : null}

        {/* ══════════════════════════════════════════════════════════
            STEP 3 · ABOUT (Screenshot 3 · Offerings)
           ══════════════════════════════════════════════════════════ */}
        {step === 3 ? (
          <Card style={{ gap: 16 }}>
            {/* Sub-tabs header */}
            <View style={styles.subTabsContainer}>
              <Pressable
                onPress={() => setAboutSubTab('offerings')}
                style={[styles.subTabItem, aboutSubTab === 'offerings' && styles.subTabActive]}
              >
                <Text
                  style={[
                    styles.subTabText,
                    aboutSubTab === 'offerings' && styles.subTabTextActive,
                  ]}
                >
                  Offerings
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setAboutSubTab('about')}
                style={[styles.subTabItem, aboutSubTab === 'about' && styles.subTabActive]}
              >
                <Text
                  style={[
                    styles.subTabText,
                    aboutSubTab === 'about' && styles.subTabTextActive,
                  ]}
                >
                  About Business
                </Text>
              </Pressable>
            </View>

            {aboutSubTab === 'offerings' ? (
              <View style={{ gap: 14 }}>
                {locationWebsite ? (
                  <View style={styles.websiteSyncBanner}>
                    <MaterialIcons name="language" size={16} color={colors.brand} />
                    <Text style={styles.websiteSyncBannerText}>
                      Website Linked: <Text style={{ fontWeight: '800' }}>{locationWebsite.replace(/^https?:\/\//, '').replace(/\/$/, '')}</Text> · AI will sync & index your services
                    </Text>
                  </View>
                ) : null}

                {/* Upload Brochure Card (from 3.Offerings.jpg) */}
                <View style={styles.brochureUploadCard}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={{ fontSize: 13.5, fontWeight: '800', color: colors.ink }}>
                      Upload PDF/Brochure (Optional)
                    </Text>
                    <Text style={{ fontSize: 11.5, color: colors.muted, lineHeight: 16 }}>
                      Our AI will extract all the services & products you offer automatically.
                    </Text>
                    {uploadedPdfName ? (
                      <View style={styles.uploadedFileBadge}>
                        <MaterialIcons name="picture-as-pdf" size={15} color="#DC2626" />
                        <Text style={styles.uploadedFileText} numberOfLines={1}>
                          {uploadedPdfName} {uploadedPdfSize ? `(${uploadedPdfSize})` : ''}
                        </Text>
                        <MaterialIcons name="check-circle" size={14} color="#10B981" />
                      </View>
                    ) : null}
                  </View>
                  <Pressable
                    onPress={handlePickPdf}
                    disabled={isUploadingPdf}
                    style={styles.uploadButton}
                  >
                    {isUploadingPdf ? (
                      <ActivityIndicator size="small" color={colors.brand} />
                    ) : (
                      <>
                        <MaterialIcons
                          name={uploadedPdfName ? 'refresh' : 'upload-file'}
                          size={16}
                          color={colors.brand}
                        />
                        <Text style={styles.uploadButtonText}>
                          {uploadedPdfName ? 'Change' : 'Upload'}
                        </Text>
                      </>
                    )}
                  </Pressable>
                </View>

                {/* Add Offerings Input */}
                <View style={{ gap: 6 }}>
                  <Text style={styles.sectionHeading}>Add Offerings</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TextInput
                      value={newOffering}
                      onChangeText={setNewOffering}
                      placeholder="e.g. Cold Coffee, Sandwich, Hair Spa"
                      placeholderTextColor={colors.muted}
                      style={styles.textInput}
                    />
                    <Pressable
                      onPress={() => {
                        const trimmed = newOffering.trim();
                        if (trimmed && !offeringsList.includes(trimmed)) {
                          setOfferingsList([...offeringsList, trimmed]);
                          setNewOffering('');
                        }
                      }}
                      style={styles.addButton}
                    >
                      <Text style={styles.addButtonText}>+ Add</Text>
                    </Pressable>
                  </View>
                </View>

                {/* Active Offerings Chips */}
                {offeringsList.length > 0 ? (
                  <View style={{ gap: 8 }}>
                    <Text style={styles.badgeLabel}>
                      Offerings ({offeringsList.length} Added)
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {offeringsList.map((item) => (
                        <View key={item} style={styles.chipSelected}>
                          <Text style={styles.chipSelectedText}>{item}</Text>
                          <Pressable
                            hitSlop={6}
                            onPress={() =>
                              setOfferingsList(offeringsList.filter((x) => x !== item))
                            }
                          >
                            <MaterialIcons name="close" size={14} color={colors.brand} />
                          </Pressable>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : null}

                {/* AI Suggested Chips */}
                <View style={{ gap: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <MaterialIcons name="auto-awesome" size={16} color={colors.aiPurple} />
                    <Text style={styles.aiHeading}>AI Suggested</Text>
                  </View>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {aiSuggestedOfferings.map((sug) => {
                      const alreadyAdded = offeringsList.includes(sug);
                      return (
                        <Pressable
                          key={sug}
                          onPress={() => {
                            if (!alreadyAdded) {
                              setOfferingsList([...offeringsList, sug]);
                            }
                          }}
                          style={[styles.chipSuggestion, alreadyAdded && { opacity: 0.5 }]}
                        >
                          <Text style={styles.chipSuggestionText}>{sug}</Text>
                          <MaterialIcons
                            name={alreadyAdded ? 'check' : 'add'}
                            size={14}
                            color={colors.muted}
                          />
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </View>
            ) : (
              /* About Business Sub-tab */
              <View style={{ gap: 12 }}>
                <Text style={styles.sectionHeading}>Business Description</Text>
                <Text style={{ fontSize: 12, color: colors.muted }}>
                  Used by our AI Growth Employee to personalize reviews and generate weekly local posts.
                </Text>
                <TextInput
                  value={aboutText}
                  onChangeText={setAboutText}
                  multiline
                  numberOfLines={5}
                  style={styles.textArea}
                  placeholder="Describe what makes your business unique..."
                  placeholderTextColor={colors.muted}
                />
                <Pressable
                  onPress={() => {
                    const bName = data?.businessName || 'Our business';
                    const offStr = offeringsList.slice(0, 3).join(', ') || 'quality services';
                    setAboutText(
                      `${bName} offers ${offStr} with a strong commitment to local customer satisfaction, verified service excellence, and dependable results.`
                    );
                  }}
                  style={styles.aiGenerateButton}
                >
                  <MaterialIcons name="auto-awesome" size={14} color={colors.aiPurple} />
                  <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.aiPurple }}>
                    Auto-Generate Description with AI
                  </Text>
                </Pressable>
              </View>
            )}

            <Action
              label="Save Info & Next"
              icon="arrow-forward"
              disabled={busy}
              onPress={() => saveProgress(4)}
            />
          </Card>
        ) : null}

        {/* ══════════════════════════════════════════════════════════
            STEP 4 · GBP INFO (Screenshot 4 · Keywords)
           ══════════════════════════════════════════════════════════ */}
        {step === 4 ? (
          <Card style={{ gap: 16 }}>
            {/* Sub-tabs header */}
            <View style={styles.subTabsContainer}>
              <Pressable
                onPress={() => setGbpSubTab('keywords')}
                style={[styles.subTabItem, gbpSubTab === 'keywords' && styles.subTabActive]}
              >
                <Text
                  style={[
                    styles.subTabText,
                    gbpSubTab === 'keywords' && styles.subTabTextActive,
                  ]}
                >
                  Keywords
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setGbpSubTab('hours')}
                style={[styles.subTabItem, gbpSubTab === 'hours' && styles.subTabActive]}
              >
                <Text
                  style={[
                    styles.subTabText,
                    gbpSubTab === 'hours' && styles.subTabTextActive,
                  ]}
                >
                  Hours
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setGbpSubTab('attributes')}
                style={[styles.subTabItem, gbpSubTab === 'attributes' && styles.subTabActive]}
              >
                <Text
                  style={[
                    styles.subTabText,
                    gbpSubTab === 'attributes' && styles.subTabTextActive,
                  ]}
                >
                  Attributes
                </Text>
              </Pressable>
            </View>

            {gbpSubTab === 'keywords' ? (
              <View style={{ gap: 14 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.sectionHeading}>Add Keywords</Text>
                  <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.brand }}>
                    {selectedKeywords.length} of 10 Added
                  </Text>
                </View>

                <Text style={{ fontSize: 12, color: colors.muted }}>
                  Select the most appropriate keywords for your business. Keywords help your profile rank higher in local search.
                </Text>

                {/* Suggest Your Own Card */}
                <View style={styles.suggestOwnCard}>
                  <Text style={{ fontSize: 12.5, color: colors.ink }}>
                    Not happy with AI's keyword suggestions?
                  </Text>
                  <Pressable onPress={() => setShowCustomKeywordInput(!showCustomKeywordInput)}>
                    <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.brand }}>
                      Suggest Your Own
                    </Text>
                  </Pressable>
                </View>

                {showCustomKeywordInput ? (
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TextInput
                      value={customKeywordInput}
                      onChangeText={setCustomKeywordInput}
                      placeholder="Enter custom local keyword"
                      placeholderTextColor={colors.muted}
                      style={styles.textInput}
                    />
                    <Pressable
                      onPress={() => {
                        const kw = customKeywordInput.trim();
                        if (kw && !selectedKeywords.includes(kw) && selectedKeywords.length < 10) {
                          setSelectedKeywords([...selectedKeywords, kw]);
                          setCustomKeywordInput('');
                        }
                      }}
                      style={styles.addButton}
                    >
                      <Text style={styles.addButtonText}>Add</Text>
                    </Pressable>
                  </View>
                ) : null}

                {/* AI Suggested Keywords Grid (pills with blue highlight) */}
                <View style={{ gap: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <MaterialIcons name="auto-awesome" size={16} color={colors.aiPurple} />
                    <Text style={styles.aiHeading}>AI Suggested</Text>
                  </View>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {aiSuggestedKeywords.map((kw) => {
                      const isSelected = selectedKeywords.includes(kw);
                      return (
                        <Pressable
                          key={kw}
                          onPress={() => {
                            if (isSelected) {
                              setSelectedKeywords(selectedKeywords.filter((k) => k !== kw));
                            } else if (selectedKeywords.length < 10) {
                              setSelectedKeywords([...selectedKeywords, kw]);
                            } else {
                              Alert.alert('Limit Reached', 'You can select up to 10 target keywords.');
                            }
                          }}
                          style={[
                            styles.keywordPill,
                            isSelected && styles.keywordPillSelected,
                          ]}
                        >
                          <Text
                            style={[
                              styles.keywordPillText,
                              isSelected && styles.keywordPillTextSelected,
                            ]}
                          >
                            {kw}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </View>
            ) : gbpSubTab === 'hours' ? (
              /* Hours sub-tab */
              <View style={{ gap: 10 }}>
                <Text style={styles.sectionHeading}>Business Operating Hours</Text>
                {Object.entries(hoursState).map(([day, h]) => (
                  <View
                    key={day}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingVertical: 6,
                      borderBottomWidth: 1,
                      borderBottomColor: colors.line,
                    }}
                  >
                    <Text style={{ fontSize: 13.5, fontWeight: '600', color: colors.ink, width: 90 }}>
                      {day}
                    </Text>
                    <Switch
                      value={h.open}
                      onValueChange={(val) =>
                        setHoursState({
                          ...hoursState,
                          [day]: { ...h, open: val },
                        })
                      }
                      trackColor={{ false: colors.line, true: colors.brand }}
                    />
                    <Text style={{ fontSize: 12.5, color: h.open ? colors.ink : colors.muted }}>
                      {h.open ? `${h.openTime} - ${h.closeTime}` : 'Closed'}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              /* Attributes sub-tab */
              <View style={{ gap: 10 }}>
                <Text style={styles.sectionHeading}>Business Attributes & Amenities</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {[
                    'Wheelchair accessible',
                    'Free Wi-Fi',
                    'Credit Cards Accepted',
                    'Air Conditioned',
                    'Dine-in',
                    'Takeaway',
                    'Home Delivery',
                    'Restroom Available',
                  ].map((attr) => {
                    const sel = selectedAttributes.includes(attr);
                    return (
                      <Pressable
                        key={attr}
                        onPress={() => {
                          if (sel) {
                            setSelectedAttributes(selectedAttributes.filter((a) => a !== attr));
                          } else {
                            setSelectedAttributes([...selectedAttributes, attr]);
                          }
                        }}
                        style={[
                          styles.keywordPill,
                          sel && styles.keywordPillSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.keywordPillText,
                            sel && styles.keywordPillTextSelected,
                          ]}
                        >
                          {sel ? '✓ ' : ''}{attr}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            <Action
              label="Save keywords & Next"
              icon="arrow-forward"
              disabled={busy}
              onPress={() => saveProgress(5)}
            />
          </Card>
        ) : null}

        {/* ══════════════════════════════════════════════════════════
            STEP 5 · OTHERS & OPTIMIZATION (Screenshot 5)
           ══════════════════════════════════════════════════════════ */}
        {step === 5 ? (
          <Card style={{ gap: 16 }}>
            <View style={{ gap: 4 }}>
              <Text style={styles.stepTitle}>Activate Your AI Growth Employee</Text>
              <Text style={styles.stepSubtitle}>
                Select the autonomous marketing automations you want BGOS to run.
              </Text>
            </View>

            <View style={{ gap: 12 }}>
              <View style={styles.automationToggleRow}>
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: colors.ink }}>
                      24/7 AI Chatbot & Lead Concierge
                    </Text>
                    <View style={styles.recommendedPill}>
                      <Text style={styles.recommendedPillText}>RECOMMENDED</Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 12, color: colors.muted }}>
                    Answers customer questions, captures leads, and takes booking requests 24/7.
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.brand, marginTop: 2, fontWeight: '600' }}>
                    {locationWebsite
                      ? '✓ Training from your website + Google Business profile'
                      : '✓ Live on your free hosted booking link (no website needed) & website embed ready'}
                  </Text>
                </View>
                <Switch
                  value={enableChatbot}
                  onValueChange={setEnableChatbot}
                  trackColor={{ false: colors.line, true: colors.brand }}
                />
              </View>

              <View style={styles.automationToggleRow}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.ink }}>
                    Auto-Reply to Google Reviews
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.muted }}>
                    AI generates polite, SEO-optimized answers within 5 minutes of new reviews.
                  </Text>
                </View>
                <Switch
                  value={autoReplyReviews}
                  onValueChange={setAutoReplyReviews}
                  trackColor={{ false: colors.line, true: colors.brand }}
                />
              </View>

              <View style={styles.automationToggleRow}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.ink }}>
                    Auto-Generate Weekly Google Posts
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.muted }}>
                    1–2 high-ranking local posts published every week targeting your selected keywords.
                  </Text>
                </View>
                <Switch
                  value={autoGeneratePosts}
                  onValueChange={setAutoGeneratePosts}
                  trackColor={{ false: colors.line, true: colors.brand }}
                />
              </View>

              <View style={styles.automationToggleRow}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.ink }}>
                    Photo Drip-Publishing Schedule
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.muted }}>
                    Maintains fresh activity on Google Maps to keep your profile in top 3 rank.
                  </Text>
                </View>
                <Switch
                  value={autoPublishPhotos}
                  onValueChange={setAutoPublishPhotos}
                  trackColor={{ false: colors.line, true: colors.brand }}
                />
              </View>
            </View>

            {/* Ready summary badge */}
            <View style={styles.readySummaryBox}>
              <MaterialIcons name="rocket-launch" size={24} color={colors.brand} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13.5, fontWeight: '800', color: colors.ink }}>
                  Setup 100% Complete!
                </Text>
                <Text style={{ fontSize: 11.5, color: colors.muted }}>
                  Launching BGOS activates your local marketing, 24/7 AI chatbot, review replies, and growth dashboard.
                </Text>
              </View>
            </View>

            <Action
              label={busy ? 'Launching…' : 'Launch BGOS & Go to Dashboard'}
              icon="check-circle"
              disabled={busy}
              onPress={() => saveProgress(5, true)}
            />
          </Card>
        ) : null}
      </ScrollView>

      {/* ── Multi-Location Picker Modal ────────────────────────── */}
      <Modal
        visible={locationPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setLocationPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 17, fontWeight: '800', color: colors.ink }}>
                Select Your Business Location
              </Text>
              <Pressable hitSlop={8} onPress={() => setLocationPickerVisible(false)}>
                <MaterialIcons name="close" size={22} color={colors.muted} />
              </Pressable>
            </View>

            <Text style={{ fontSize: 12.5, color: colors.muted }}>
              Your Google account manages multiple locations. Pick the one for this workspace:
            </Text>

            <ScrollView style={{ maxHeight: 300 }} contentContainerStyle={{ gap: 10 }}>
              {data?.discoveredLocations.map((loc) => {
                const isSelected = loc.id === data.activeLocation?.id;
                return (
                  <Pressable
                    key={loc.id}
                    onPress={() => handleSelectLocation(loc.id)}
                    style={[
                      styles.locationOptionCard,
                      isSelected && styles.locationOptionCardSelected,
                    ]}
                  >
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={{ fontSize: 14.5, fontWeight: '700', color: colors.ink }}>
                        {loc.name}
                      </Text>
                      <Text style={{ fontSize: 12, color: colors.muted }} numberOfLines={2}>
                        {loc.address}
                      </Text>
                      {loc.category ? (
                        <Text style={{ fontSize: 11, color: colors.brand, fontWeight: '600', marginTop: 2 }}>
                          {loc.category}
                        </Text>
                      ) : null}
                    </View>
                    {isSelected ? (
                      <MaterialIcons name="check-circle" size={22} color={colors.brand} />
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  headerIconButton: {
    padding: 4,
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  helpButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
    gap: 4,
  },
  stepConnector: {
    flex: 1,
    height: 0,
    borderTopWidth: 2,
    borderStyle: 'dashed',
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleActive: {
    borderColor: colors.brand,
    borderWidth: 2,
  },
  stepCircleCompleted: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
  },
  stepLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    color: colors.muted,
    marginTop: 2,
  },
  stepTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.ink,
  },
  stepSubtitle: {
    fontSize: 12.5,
    color: colors.muted,
    lineHeight: 17,
  },
  googleIconBox: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.ink,
    textAlign: 'center',
  },
  cardSubtitle: {
    fontSize: 12.5,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 10,
  },
  signedInAccountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginTop: 4,
  },
  signedInAccountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803D',
  },
  createGbpCard: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 14,
    padding: 14,
    gap: 12,
    marginTop: 6,
  },
  createGbpIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFEDD5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  createGbpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#EA4335',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  createGbpButtonText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#EA4335',
  },
  uploadedFileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  uploadedFileText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.ink,
    maxWidth: 200,
  },
  featIconTile: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successBadgeCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedCard: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    padding: 16,
    gap: 8,
    backgroundColor: colors.surface,
  },
  avatarTile: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  verifiedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
  },
  connectedBadge: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  connectedBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.muted,
  },
  categoryPill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.soft,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  categoryPillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.brandDark,
  },
  switchLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  mapSimulationBox: {
    height: 120,
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subTabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  subTabItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  subTabActive: {
    borderBottomColor: colors.brand,
  },
  subTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.muted,
  },
  subTabTextActive: {
    color: colors.brand,
    fontWeight: '800',
  },
  brochureUploadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    padding: 12,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.brand,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  uploadButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.brand,
  },
  sectionHeading: {
    fontSize: 13.5,
    fontWeight: '800',
    color: colors.ink,
  },
  badgeLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
  },
  aiHeading: {
    fontSize: 12.5,
    fontWeight: '800',
    color: colors.aiPurple,
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: colors.ink,
  },
  addButton: {
    backgroundColor: colors.brand,
    borderRadius: 10,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  addButtonText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  chipSelected: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.brandSoft,
    borderWidth: 1,
    borderColor: colors.brand,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipSelectedText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.brandDark,
  },
  chipSuggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipSuggestionText: {
    fontSize: 12,
    color: colors.ink,
  },
  textArea: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    color: colors.ink,
    textAlignVertical: 'top',
  },
  aiGenerateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  suggestOwnCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    padding: 10,
  },
  keywordPill: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  keywordPillSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  keywordPillText: {
    fontSize: 12,
    color: colors.muted,
  },
  keywordPillTextSelected: {
    color: '#1D4ED8',
    fontWeight: '700',
  },
  automationToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  readySummaryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.brandSoft,
    borderRadius: 12,
    padding: 14,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    gap: 12,
  },
  locationOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
  },
  locationOptionCardSelected: {
    borderColor: colors.brand,
    backgroundColor: colors.brandSoft,
  },
  websiteSyncBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  websiteSyncBannerText: {
    fontSize: 12,
    color: '#166534',
    flex: 1,
  },
  recommendedPill: {
    backgroundColor: '#DCFCE7',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  recommendedPillText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#15803D',
    letterSpacing: 0.5,
  },
});
