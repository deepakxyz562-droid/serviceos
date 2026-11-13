import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
  Share,
  Alert,
  TextInput,
  Switch,
  Modal,
  Platform,
  Linking,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Screen, Card, ui, colors } from '../src/components/ui';
import { apiRequest } from '../src/lib/api';
import { getToken } from '../src/lib/auth';
import { WEB_URL } from '../src/lib/constants';

interface StandeeTemplate {
  id: string;
  name: string;
  themeColor: string;
  accentColor: string;
  bgColor: string;
  textColor: string;
  cardBorder: string;
}

type QrTargetKey = 'review' | 'page' | 'maps';

interface QrTargetEntry {
  url: string;
  qrDataUrl: string;
  headline?: string;
  subheadline?: string;
}

interface StandeeData {
  businessName: string;
  tagline: string;
  rating: number;
  totalReviews: number;
  phone: string;
  address: string;
  reviewUrl?: string;
  pageUrl?: string;
  mapsUrl?: string;
  qrDataUrl: string;
  targets?: Record<QrTargetKey, QrTargetEntry>;
  defaultSvg: string;
  logoUrl?: string | null;
  headline?: string;
  templates: StandeeTemplate[];
  sizes: Array<{ id: string; name: string; width: number; height: number }>;
}

const DEFAULT_TEMPLATES: StandeeTemplate[] = [
  {
    id: 'google_grexa_standee',
    name: 'Google Wave Official (With Logo)',
    themeColor: '#1A73E8',
    accentColor: '#EA4335',
    bgColor: '#FFFFFF',
    textColor: '#0F172A',
    cardBorder: '#E2E8F0',
  },
  {
    id: 'google_verified',
    name: 'Google Verified Blue',
    themeColor: '#1A73E8',
    accentColor: '#EA4335',
    bgColor: '#FFFFFF',
    textColor: '#202124',
    cardBorder: '#DADCE0',
  },
  {
    id: 'minimalist_black',
    name: 'Classic Minimalist',
    themeColor: '#0F172A',
    accentColor: '#334155',
    bgColor: '#FFFFFF',
    textColor: '#0F172A',
    cardBorder: '#E2E8F0',
  },
  {
    id: 'warm_gold',
    name: 'Hospitality Gold',
    themeColor: '#B45309',
    accentColor: '#D97706',
    bgColor: '#FFFDF9',
    textColor: '#78350F',
    cardBorder: '#FDE68A',
  },
  {
    id: 'modern_emerald',
    name: 'Modern Emerald',
    themeColor: '#059669',
    accentColor: '#10B981',
    bgColor: '#F0FDF4',
    textColor: '#064E3B',
    cardBorder: '#A7F3D0',
  },
];

const DEFAULT_SIZES = [
  { id: 'a5', name: 'A5 Table Standee (148 × 210 mm)', width: 148, height: 210 },
  { id: 'table_tent', name: 'Countertop Table Tent (4 × 6 in)', width: 102, height: 152 },
  { id: 'square_badge', name: 'Countertop Sticker (100 × 100 mm)', width: 100, height: 100 },
];

export default function QrStandeeScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<StandeeData | null>(null);

  // Customization state
  const [selectedTemplateId, setSelectedTemplateId] = useState('google_grexa_standee');
  const [selectedSize, setSelectedSize] = useState<'a5' | 'table_tent' | 'square_badge'>('a5');
  const [qrTarget, setQrTarget] = useState<QrTargetKey>('review');
  const [headline, setHeadline] = useState('Scan to Rate Us on Google');
  const [subheadline, setSubheadline] = useState('Your feedback helps our team grow!');
  const [showRating, setShowRating] = useState(true);
  const [showContact, setShowContact] = useState(true);
  const [includeLogo, setIncludeLogo] = useState(true);
  const [customLogoUrl, setCustomLogoUrl] = useState<string | null>(null);

  // Generated state
  const [generating, setGenerating] = useState(false);
  const [generatedHtml, setGeneratedHtml] = useState<string | null>(null);
  const [printPreviewOpen, setPrintPreviewOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      // First attempt: try dedicated /api/bgos/qr/standee
      const [res, brandRes] = await Promise.all([
        apiRequest<StandeeData>('/api/bgos/qr/standee'),
        apiRequest<any>('/api/brand-profile').catch(() => null),
      ]);
      setData(res);
      if (res.headline) setHeadline(res.headline);
      const resolvedLogo = res.logoUrl || brandRes?.brandDetails?.logoUrl || null;
      if (resolvedLogo) setCustomLogoUrl(resolvedLogo);
    } catch (e: any) {
      // Graceful fallback: synthesize standee from existing /api/gbp/place & /api/bgos/qr
      try {
        const [placeRes, qrRes, brandRes] = await Promise.all([
          apiRequest<any>('/api/gbp/place').catch(() => null),
          apiRequest<any>('/api/bgos/qr?target=review').catch(() => null),
          apiRequest<any>('/api/brand-profile').catch(() => null),
        ]);

        const place = placeRes?.place || placeRes?.tenantFallback;
        const bName = place?.title || place?.name || 'Our Business';
        const phone = place?.phone || '';
        const address = place?.address || '';
        const rating = placeRes?.metrics?.avgRating || 5.0;
        const totalReviews = placeRes?.metrics?.totalReviews || 0;
        const reviewUrl =
          place?.reviewUrl ||
          place?.mapsUrl ||
          qrRes?.url ||
          'https://search.google.com/local/writereview';
        const qrDataUrl = qrRes?.image || '';
        const resolvedLogo = brandRes?.brandDetails?.logoUrl || null;
        if (resolvedLogo) setCustomLogoUrl(resolvedLogo);

        setData({
          businessName: bName,
          tagline: 'We appreciate your business & feedback!',
          rating,
          totalReviews,
          phone,
          address,
          reviewUrl,
          qrDataUrl,
          defaultSvg: '',
          logoUrl: resolvedLogo,
          templates: DEFAULT_TEMPLATES,
          sizes: DEFAULT_SIZES,
        });
      } catch {
        Alert.alert('Notice', 'Connect your Google Business Profile to preview review standees.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenPrintPage = async () => {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && generatedHtml) {
        const win = window.open('', '_blank');
        if (win) {
          win.document.write(generatedHtml);
          win.document.close();
          win.focus();
          setTimeout(() => win.print(), 300);
          return;
        }
      }
      const token = await getToken();
      const params = new URLSearchParams({
        format: 'html',
        templateId: selectedTemplateId,
        size: selectedSize,
        target: qrTarget,
        headline,
        subheadline,
        showRating: String(showRating),
        showContact: String(showContact),
      });
      if (token) params.set('auth', token);
      const printableUrl = `${WEB_URL}/api/bgos/qr/standee?${params.toString()}`;

      // Open in device default system browser (Safari/Chrome) where AirPrint and Save as PDF work natively
      const canOpen = await Linking.canOpenURL(printableUrl).catch(() => false);
      if (canOpen) {
        await Linking.openURL(printableUrl);
      } else {
        await WebBrowser.openBrowserAsync(printableUrl);
      }
    } catch (err: unknown) {
      Alert.alert('Print Preview', err instanceof Error ? err.message : 'Unable to open print preview.');
    }
  };

  const handleShareStandee = async () => {
    try {
      const token = await getToken();
      const params = new URLSearchParams({
        format: 'html',
        templateId: selectedTemplateId,
        size: selectedSize,
        target: qrTarget,
        headline,
        subheadline,
        showRating: String(showRating),
        showContact: String(showContact),
      });
      if (token) params.set('auth', token);
      const printableUrl = `${WEB_URL}/api/bgos/qr/standee?${params.toString()}`;

      await Share.share({
        title: `${data?.businessName || 'Business'} - Print-Ready QR Standee (${selectedSize.toUpperCase()})`,
        message: `Print-ready QR standee for ${data?.businessName || 'our business'}:\n\nPrint or Save PDF: ${printableUrl}\n\nDirect QR link: ${activeTargetUrl}`,
        url: printableUrl,
      });
    } catch {
      Alert.alert('Notice', 'Could not open share dialogue.');
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await apiRequest<{ success: boolean; html: string; svg: string }>('/api/bgos/qr/standee', {
        method: 'POST',
        body: {
          templateId: selectedTemplateId,
          size: selectedSize,
          target: qrTarget,
          headline,
          subheadline,
          showRating,
          showContact,
          logoUrl: includeLogo ? customLogoUrl : null,
        },
      });
      if (res?.html) {
        setGeneratedHtml(res.html);
      }
      setPrintPreviewOpen(true);
    } catch {
      // Offline or network fallback: open print studio with live client standee
      setPrintPreviewOpen(true);
    } finally {
      setGenerating(false);
    }
  };

  const handleShareLink = async () => {
    if (!activeTargetUrl) return;
    try {
      await Share.share({
        message: `${qrTarget === 'review' ? 'Please take 15 seconds to review' : 'Visit'} ${data?.businessName || 'us'}: ${activeTargetUrl}`,
        url: activeTargetUrl,
      });
    } catch {}
  };

  const activeTargetEntry = data?.targets?.[qrTarget];
  const activeTargetUrl =
    activeTargetEntry?.url ||
    (qrTarget === 'page'
      ? data?.pageUrl
      : qrTarget === 'maps'
        ? data?.mapsUrl
        : data?.reviewUrl) ||
    data?.reviewUrl ||
    '';
  const activeQrDataUrl = activeTargetEntry?.qrDataUrl || data?.qrDataUrl || '';

  const selectQrTarget = (next: QrTargetKey) => {
    setQrTarget(next);
    const meta = data?.targets?.[next];
    if (meta?.headline) setHeadline(meta.headline);
    else if (next === 'page') setHeadline('Scan to Book & Order Online');
    else if (next === 'maps') setHeadline('Scan to Find Us on Google Maps');
    else setHeadline('Scan to Rate Us on Google');

    if (meta?.subheadline) setSubheadline(meta.subheadline);
    else if (next === 'page') setSubheadline('Browse services, products & chat instantly!');
    else if (next === 'maps') setSubheadline('Directions, photos, hours & Google profile');
    else setSubheadline('Your feedback helps our team grow!');
  };

  const currentTemplate = data?.templates?.find((t) => t.id === selectedTemplateId) || {
    id: 'google_verified',
    name: 'Google Verified Blue',
    themeColor: '#1A73E8',
    bgColor: '#FFFFFF',
    textColor: '#202124',
    cardBorder: '#DADCE0',
  };

  const ratingStars = Math.round(data?.rating || 5);
  const starsString = '★'.repeat(ratingStars);

  return (
    <Screen
      title="Printable QR Standee Studio"
      subtitle="Tabletop review signs with live verified Google rating."
      onRefresh={loadData}
    >
      {loading && !data ? (
        <View style={{ padding: 40, alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.brand} />
          <Text style={{ marginTop: 12, color: colors.muted, fontSize: 13 }}>Loading review QR studio...</Text>
        </View>
      ) : (
        <View style={{ gap: 16 }}>
          {/* 0. QR TARGET DESTINATION SWITCHER */}
          <Card style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: colors.ink }}>
                What should customers scan to open?
              </Text>
              <View
                style={{
                  backgroundColor: '#F1F5F9',
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 8,
                }}
              >
                <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#64748B' }}>
                  {qrTarget === 'review'
                    ? 'Verified Review'
                    : qrTarget === 'page'
                      ? 'Catalog & Assistant'
                      : 'Maps Navigation'}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(
                [
                  {
                    id: 'review',
                    label: 'Google Review',
                    sub: '5-Star Feedback',
                    icon: 'star',
                    activeColor: '#EA4335',
                    activeBg: '#FEF2F2',
                  },
                  {
                    id: 'page',
                    label: 'Book & Order',
                    sub: 'Store & Chatbot',
                    icon: 'storefront',
                    activeColor: colors.brand,
                    activeBg: colors.brandSoft,
                  },
                  {
                    id: 'maps',
                    label: 'Google Maps',
                    sub: 'Route & Profile',
                    icon: 'place',
                    activeColor: '#1A73E8',
                    activeBg: '#EFF6FF',
                  },
                ] as const
              ).map((opt) => {
                const selected = qrTarget === opt.id;
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => selectQrTarget(opt.id)}
                    style={{
                      flex: 1,
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                      paddingVertical: 10,
                      paddingHorizontal: 4,
                      borderRadius: 12,
                      backgroundColor: selected ? opt.activeBg : '#F8FAFC',
                      borderWidth: selected ? 2 : 1,
                      borderColor: selected ? opt.activeColor : '#E2E8F0',
                    }}
                  >
                    <View
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 14,
                        backgroundColor: selected ? opt.activeColor : '#E2E8F0',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <MaterialIcons
                        name={opt.icon}
                        size={15}
                        color={selected ? '#FFFFFF' : '#64748B'}
                      />
                    </View>
                    <Text
                      numberOfLines={1}
                      style={{
                        fontSize: 11.5,
                        fontWeight: selected ? '800' : '600',
                        color: selected ? opt.activeColor : colors.ink,
                        textAlign: 'center',
                      }}
                    >
                      {opt.label}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={{
                        fontSize: 9.5,
                        color: selected ? opt.activeColor : '#64748B',
                        textAlign: 'center',
                      }}
                    >
                      {opt.sub}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Card>

          {/* 1. LIVE STANDEE PREVIEW CARD */}
          <Card
            style={{
              padding: 0,
              overflow: 'hidden',
              backgroundColor: currentTemplate.bgColor,
              borderColor: currentTemplate.cardBorder,
              borderWidth: 2,
            }}
          >
            {/* Top Accent Stripe / Google 4-Color Wave Header */}
            {selectedTemplateId === 'google_grexa_standee' ? (
              <View style={{ flexDirection: 'row', height: 8, width: '100%' }}>
                <View style={{ flex: 1, backgroundColor: '#EA4335' }} />
                <View style={{ flex: 1, backgroundColor: '#FBBC05' }} />
                <View style={{ flex: 1, backgroundColor: '#34A853' }} />
                <View style={{ flex: 1, backgroundColor: '#4285F4' }} />
              </View>
            ) : (
              <View style={{ height: 6, backgroundColor: currentTemplate.themeColor }} />
            )}

            <View style={{ padding: 20, alignItems: 'center', gap: 12 }}>
              {/* Google "G" Badge & 5 Golden Stars for Google Grexa Template */}
              {selectedTemplateId === 'google_grexa_standee' ? (
                <View style={{ alignItems: 'center', gap: 4 }}>
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: '#FFFFFF',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1.5,
                      borderColor: '#F1F5F9',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.1,
                      shadowRadius: 4,
                      elevation: 3,
                    }}
                  >
                    <Text style={{ fontSize: 22, fontWeight: '900', color: '#4285F4' }}>G</Text>
                  </View>
                  <Text style={{ fontSize: 13, color: '#FBBC05', letterSpacing: 2 }}>★★★★★</Text>
                </View>
              ) : null}

              {/* Business Logo & Name & Tagline */}
              <View style={{ alignItems: 'center' }}>
                {includeLogo && customLogoUrl ? (
                  <Image
                    source={{ uri: customLogoUrl }}
                    style={{ width: 90, height: 26, marginBottom: 4 }}
                    resizeMode="contain"
                  />
                ) : null}
                <Text style={{ fontSize: 18, fontWeight: '800', color: currentTemplate.themeColor, textAlign: 'center' }}>
                  {data?.businessName}
                </Text>
                {data?.tagline ? (
                  <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2, textAlign: 'center' }}>
                    {data.tagline}
                  </Text>
                ) : null}
              </View>

              {/* Callout Box */}
              <View
                style={{
                  width: '100%',
                  backgroundColor: '#FFFFFF',
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: currentTemplate.cardBorder,
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 13.5, fontWeight: '800', color: currentTemplate.textColor, textAlign: 'center' }}>
                  {headline}
                </Text>
                <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2, textAlign: 'center' }}>
                  {subheadline}
                </Text>
              </View>

              {/* QR Code Container with optional Google 4-Color Corner Brackets */}
              <View
                style={{
                  backgroundColor: '#FFFFFF',
                  padding: 12,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: currentTemplate.cardBorder,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.06,
                  shadowRadius: 4,
                  elevation: 2,
                  position: 'relative',
                }}
              >
                {selectedTemplateId === 'google_grexa_standee' ? (
                  <>
                    {/* Top-Left Red Bracket */}
                    <View style={{ position: 'absolute', top: 4, left: 4, width: 16, height: 16, borderTopWidth: 3.5, borderLeftWidth: 3.5, borderColor: '#EA4335', borderTopLeftRadius: 6 }} />
                    {/* Top-Right Blue Bracket */}
                    <View style={{ position: 'absolute', top: 4, right: 4, width: 16, height: 16, borderTopWidth: 3.5, borderRightWidth: 3.5, borderColor: '#4285F4', borderTopRightRadius: 6 }} />
                    {/* Bottom-Left Yellow Bracket */}
                    <View style={{ position: 'absolute', bottom: 4, left: 4, width: 16, height: 16, borderBottomWidth: 3.5, borderLeftWidth: 3.5, borderColor: '#FBBC05', borderBottomLeftRadius: 6 }} />
                    {/* Bottom-Right Green Bracket */}
                    <View style={{ position: 'absolute', bottom: 4, right: 4, width: 16, height: 16, borderBottomWidth: 3.5, borderRightWidth: 3.5, borderColor: '#34A853', borderBottomRightRadius: 6 }} />
                  </>
                ) : null}

                {activeQrDataUrl ? (
                  <Image
                    source={{ uri: activeQrDataUrl }}
                    style={{ width: 170, height: 170 }}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={{ width: 170, height: 170, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}>
                    <ActivityIndicator size="small" color={colors.brand} />
                  </View>
                )}
              </View>

              {/* Verified Honest Rating Badge */}
              {showRating && (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    backgroundColor: '#F8FAFC',
                    paddingHorizontal: 14,
                    paddingVertical: 6,
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: currentTemplate.cardBorder,
                  }}
                >
                  <Text style={{ fontSize: 13, color: '#F59E0B' }}>{starsString}</Text>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: currentTemplate.textColor }}>
                    {data?.rating && data.rating > 0 ? data.rating.toFixed(1) : '5.0'}
                  </Text>
                  <Text style={{ fontSize: 11, color: '#64748B' }}>
                    ({data?.totalReviews || 0} review{data?.totalReviews === 1 ? '' : 's'})
                  </Text>
                </View>
              )}

              {/* Scan Guidance */}
              <View style={{ alignItems: 'center', marginTop: 2 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: currentTemplate.themeColor }}>
                  📷 Open Camera & Point at QR Code
                </Text>
                <Text style={{ fontSize: 10, color: '#94A3B8', marginTop: 2 }}>
                  Takes only 15 seconds • Verified on Google Maps
                </Text>
              </View>

              {/* Powered By BGOS Logo with Icon */}
              <View style={{ alignItems: 'center', marginTop: 4 }}>
                <Text style={{ fontSize: 9.5, fontWeight: '600', color: '#94A3B8', marginBottom: 4 }}>
                  Powered By
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    backgroundColor: '#F8FAFC',
                    paddingHorizontal: 12,
                    paddingVertical: 5,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                  }}
                >
                  <Image
                    source={require('../assets/brand-mark.png')}
                    style={{ width: 18, height: 18, borderRadius: 4 }}
                    resizeMode="contain"
                  />
                  <Text style={{ fontSize: 13.5, fontWeight: '900', color: '#0F172A', letterSpacing: -0.3 }}>
                    BGOS
                  </Text>
                </View>
              </View>

              {/* Contact Footer */}
              {showContact && (data?.phone || data?.address) ? (
                <View style={{ borderTopWidth: 1, borderTopColor: currentTemplate.cardBorder, paddingTop: 8, width: '100%', alignItems: 'center' }}>
                  <Text style={{ fontSize: 10, color: '#64748B', textAlign: 'center' }}>
                    {[data?.phone, data?.address].filter(Boolean).join(' • ')}
                  </Text>
                </View>
              ) : null}
            </View>
          </Card>

          {/* 2. THEME & TEMPLATE SELECTOR */}
          <Card style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={ui.heading}>Design Theme</Text>
              <Text style={{ fontSize: 11, fontWeight: '700', color: currentTemplate.themeColor }}>
                {currentTemplate.name}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {(data?.templates || []).map((t) => {
                const isSelected = selectedTemplateId === t.id;
                const isWave = t.id === 'google_grexa_standee';
                return (
                  <Pressable
                    key={t.id}
                    onPress={() => setSelectedTemplateId(t.id)}
                    style={{
                      width: '48%',
                      borderRadius: 14,
                      borderWidth: isSelected ? 2 : 1,
                      borderColor: isSelected ? t.themeColor : '#E2E8F0',
                      backgroundColor: isSelected ? '#FFFFFF' : '#FAFAFA',
                      overflow: 'hidden',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: isSelected ? 2 : 1 },
                      shadowOpacity: isSelected ? 0.08 : 0.03,
                      shadowRadius: isSelected ? 4 : 2,
                      elevation: isSelected ? 2 : 1,
                    }}
                  >
                    {/* Miniature Standee Swatch Header */}
                    {isWave ? (
                      <View style={{ flexDirection: 'row', height: 6, width: '100%' }}>
                        <View style={{ flex: 1, backgroundColor: '#EA4335' }} />
                        <View style={{ flex: 1, backgroundColor: '#FBBC05' }} />
                        <View style={{ flex: 1, backgroundColor: '#34A853' }} />
                        <View style={{ flex: 1, backgroundColor: '#4285F4' }} />
                      </View>
                    ) : (
                      <View style={{ height: 6, backgroundColor: t.themeColor }} />
                    )}

                    <View style={{ padding: 10, gap: 6 }}>
                      {/* Mini Mockup Visual */}
                      <View
                        style={{
                          height: 38,
                          backgroundColor: t.bgColor,
                          borderRadius: 6,
                          borderWidth: 1,
                          borderColor: t.cardBorder,
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexDirection: 'row',
                          gap: 6,
                        }}
                      >
                        {isWave ? (
                          <Text style={{ fontSize: 11, fontWeight: '900', color: '#4285F4' }}>G</Text>
                        ) : (
                          <View
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: 4,
                              backgroundColor: t.themeColor,
                            }}
                          />
                        )}
                        <View
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: 3,
                            borderWidth: 1,
                            borderColor: t.textColor,
                            backgroundColor: '#FFFFFF',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <MaterialIcons name="qr-code-2" size={14} color={t.textColor} />
                        </View>
                        <Text style={{ fontSize: 9, color: '#F59E0B' }}>★★★</Text>
                      </View>

                      {/* Theme Name & Active Indicator */}
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 4,
                        }}
                      >
                        <Text
                          numberOfLines={1}
                          style={{
                            fontSize: 11.5,
                            fontWeight: isSelected ? '800' : '600',
                            color: isSelected ? t.textColor : '#334155',
                            flex: 1,
                          }}
                        >
                          {t.name.replace(' (With Logo)', '')}
                        </Text>
                        {isSelected ? (
                          <MaterialIcons name="check-circle" size={15} color={t.themeColor} />
                        ) : null}
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </Card>

          {/* 3. PRINT SIZE SELECTOR */}
          <Card>
            <Text style={ui.heading}>Standee Size</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
              {[
                { id: 'a5', label: 'A5 Table Standee\n148 × 210 mm' },
                { id: 'table_tent', label: 'Table Tent\n4 × 6 inches' },
                { id: 'square_badge', label: 'Counter Sticker\n100 × 100 mm' },
              ].map((s) => {
                const isSelected = selectedSize === s.id;
                return (
                  <Pressable
                    key={s.id}
                    onPress={() => setSelectedSize(s.id as any)}
                    style={{
                      flex: 1,
                      padding: 10,
                      borderRadius: 12,
                      borderWidth: 1.5,
                      borderColor: isSelected ? colors.brand : '#E2E8F0',
                      backgroundColor: isSelected ? colors.surface : '#FFFFFF',
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: isSelected ? '800' : '600', color: isSelected ? colors.brand : colors.ink, textAlign: 'center' }}>
                      {s.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Card>

          {/* 4. CUSTOMIZE HEADINGS & TOGGLES */}
          <Card>
            <Text style={ui.heading}>Custom Messaging</Text>

            <View style={{ gap: 10, marginTop: 6 }}>
              <View>
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.muted, marginBottom: 4 }}>
                  Main Callout Headline
                </Text>
                <TextInput
                  value={headline}
                  onChangeText={setHeadline}
                  placeholder="Scan to Review Us on Google"
                  style={{
                    backgroundColor: '#F8FAFC',
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    fontSize: 12.5,
                    color: colors.ink,
                  }}
                />
              </View>

              <View>
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.muted, marginBottom: 4 }}>
                  Subtitle / Gratitude Note
                </Text>
                <TextInput
                  value={subheadline}
                  onChangeText={setSubheadline}
                  placeholder="Your feedback helps our team grow!"
                  style={{
                    backgroundColor: '#F8FAFC',
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    fontSize: 12.5,
                    color: colors.ink,
                  }}
                />
              </View>

              <View style={[ui.row, { justifyContent: 'space-between', paddingVertical: 4 }]}>
                <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.ink }}>
                  Show Live Google Rating Badge
                </Text>
                <Switch value={showRating} onValueChange={setShowRating} />
              </View>

              <View style={[ui.row, { justifyContent: 'space-between', paddingVertical: 4 }]}>
                <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.ink }}>
                  Show Phone & Store Address
                </Text>
                <Switch value={showContact} onValueChange={setShowContact} />
              </View>
            </View>
          </Card>

          {/* 5. LOGO & BRANDING */}
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View>
                <Text style={ui.heading}>Store Logo</Text>
                <Text style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>
                  Display your store logo alongside &quot;Powered by BGOS&quot;
                </Text>
              </View>
              <Switch value={includeLogo} onValueChange={setIncludeLogo} />
            </View>

            {includeLogo && (
              <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9', gap: 10 }}>
                {customLogoUrl ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8FAFC', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Image source={{ uri: customLogoUrl }} style={{ width: 44, height: 44, borderRadius: 8, backgroundColor: '#FFFFFF' }} resizeMode="contain" />
                      <View>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink }}>Store Logo Included</Text>
                        <Text style={{ fontSize: 11, color: '#64748B' }}>Active on your standee print</Text>
                      </View>
                    </View>
                    <Pressable
                      onPress={() => router.push('/logo-management')}
                      style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE' }}
                    >
                      <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#1D4ED8' }}>Change</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={{ backgroundColor: '#F8FAFC', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', gap: 8 }}>
                    <Text style={{ fontSize: 12, color: '#64748B' }}>
                      No custom logo uploaded yet. Your business name and Powered by BGOS will be featured.
                    </Text>
                    <Pressable
                      onPress={() => router.push('/logo-management')}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        backgroundColor: '#1E293B',
                        paddingVertical: 9,
                        borderRadius: 8,
                      }}
                    >
                      <MaterialIcons name="add-photo-alternate" size={16} color="#FFFFFF" />
                      <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>
                        Upload Business Logo
                      </Text>
                    </Pressable>
                  </View>
                )}
              </View>
            )}
          </Card>

          {/* 6. ACTIONS: GENERATE & SHARE */}
          <View style={{ gap: 10, marginBottom: 30 }}>
            <Pressable
              onPress={handleGenerate}
              disabled={generating}
              style={{
                backgroundColor: colors.brand,
                paddingVertical: 14,
                borderRadius: 14,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 8,
              }}
            >
              {generating ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <MaterialIcons name="print" size={20} color="#FFFFFF" />
                  <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>
                    Generate Print-Ready Standee
                  </Text>
                </>
              )}
            </Pressable>

            <Pressable
              onPress={handleShareLink}
              style={{
                backgroundColor: '#FFFFFF',
                borderWidth: 1.5,
                borderColor: '#E2E8F0',
                paddingVertical: 12,
                borderRadius: 14,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 8,
              }}
            >
              <MaterialIcons name="share" size={18} color={colors.ink} />
              <Text style={{ color: colors.ink, fontSize: 13, fontWeight: '700' }}>
                {qrTarget === 'review' ? 'Share Direct Review Link' : 'Share QR Target Link'}
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      <Modal
        visible={printPreviewOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setPrintPreviewOpen(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            justifyContent: 'flex-end',
          }}
        >
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 20,
              gap: 14,
              maxHeight: '90%',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View>
                <Text style={{ fontSize: 18, fontWeight: '800', color: colors.ink }}>
                  Print-Ready Standee Studio
                </Text>
                <Text style={{ fontSize: 12, color: colors.brand, fontWeight: '700', marginTop: 2 }}>
                  {currentTemplate.name} • {selectedSize.toUpperCase()} (300 DPI Vector)
                </Text>
              </View>
              <Pressable onPress={() => setPrintPreviewOpen(false)} hitSlop={10} style={{ padding: 4 }}>
                <MaterialIcons name="close" size={24} color={colors.muted} />
              </Pressable>
            </View>

            {/* Visual Mini Standee Card Preview */}
            <View
              style={{
                alignItems: 'center',
                backgroundColor: currentTemplate.bgColor,
                borderRadius: 16,
                borderWidth: 1.5,
                borderColor: currentTemplate.cardBorder,
                padding: 14,
                gap: 8,
              }}
            >
              {selectedTemplateId === 'google_grexa_standee' ? (
                <View style={{ flexDirection: 'row', height: 4, width: '100%', borderRadius: 2, overflow: 'hidden' }}>
                  <View style={{ flex: 1, backgroundColor: '#EA4335' }} />
                  <View style={{ flex: 1, backgroundColor: '#FBBC05' }} />
                  <View style={{ flex: 1, backgroundColor: '#34A853' }} />
                  <View style={{ flex: 1, backgroundColor: '#4285F4' }} />
                </View>
              ) : null}

              <Text style={{ fontSize: 15, fontWeight: '800', color: currentTemplate.themeColor }}>
                {data?.businessName}
              </Text>

              <View
                style={{
                  backgroundColor: '#FFFFFF',
                  paddingVertical: 5,
                  paddingHorizontal: 10,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: currentTemplate.cardBorder,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '800', color: currentTemplate.textColor }}>
                  {headline}
                </Text>
              </View>

              {activeQrDataUrl ? (
                <Image
                  source={{ uri: activeQrDataUrl }}
                  style={{ width: 110, height: 110, borderRadius: 10, backgroundColor: '#FFFFFF' }}
                  resizeMode="contain"
                />
              ) : null}

              {showRating ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={{ fontSize: 11, color: '#FBBC05' }}>★★★★★</Text>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: currentTemplate.textColor }}>
                    {(data?.rating || 5.0).toFixed(1)} ★ ({data?.totalReviews || 0} reviews)
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Target Destination Chip */}
            <View
              style={{
                backgroundColor: '#F8FAFC',
                borderWidth: 1,
                borderColor: '#E2E8F0',
                borderRadius: 12,
                padding: 10,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <MaterialIcons name="qr-code-2" size={18} color={colors.brand} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748B' }}>
                  QR DESTINATION: {qrTarget === 'review' ? 'GOOGLE REVIEW' : qrTarget === 'page' ? 'STORE PAGE' : 'GOOGLE MAPS'}
                </Text>
                <Text style={{ fontSize: 11.5, color: '#0F172A', fontWeight: '600' }} numberOfLines={1}>
                  {activeTargetUrl || data?.reviewUrl}
                </Text>
              </View>
            </View>

            {/* 3 Clear Action Buttons */}
            <View style={{ gap: 8 }}>
              {/* Button 1: Open System Print */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open print page or save PDF"
                onPress={() => {
                  setPrintPreviewOpen(false);
                  void handleOpenPrintPage();
                }}
                style={{
                  backgroundColor: colors.brand,
                  borderRadius: 14,
                  paddingVertical: 13,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <MaterialIcons name="print" size={20} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>
                  Open Print Page / Save PDF
                </Text>
              </Pressable>

              {/* Button 2: Share Standee File & Direct Link */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Share standee file and link"
                onPress={() => {
                  setPrintPreviewOpen(false);
                  void handleShareStandee();
                }}
                style={{
                  backgroundColor: '#0F172A',
                  borderRadius: 14,
                  paddingVertical: 12,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <MaterialIcons name="share" size={18} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontSize: 13.5, fontWeight: '800' }}>
                  Share Standee Graphic & PDF Link
                </Text>
              </Pressable>

              {/* Button 3: Share QR Target Link */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Share target link only"
                onPress={() => {
                  setPrintPreviewOpen(false);
                  void handleShareLink();
                }}
                style={{
                  backgroundColor: '#F1F5F9',
                  borderRadius: 14,
                  paddingVertical: 11,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <MaterialIcons name="link" size={18} color={colors.ink} />
                <Text style={{ color: colors.ink, fontSize: 13, fontWeight: '700' }}>
                  Copy / Share Direct Link Instead
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
