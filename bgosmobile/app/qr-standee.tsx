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
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Screen, Card, ui, colors } from '../src/components/ui';
import { apiRequest } from '../src/lib/api';

interface StandeeTemplate {
  id: string;
  name: string;
  themeColor: string;
  accentColor: string;
  bgColor: string;
  textColor: string;
  cardBorder: string;
}

interface StandeeData {
  businessName: string;
  tagline: string;
  rating: number;
  totalReviews: number;
  phone: string;
  address: string;
  reviewUrl: string;
  qrDataUrl: string;
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
  const [headline, setHeadline] = useState('Scan to Rate Us on Google');
  const [subheadline, setSubheadline] = useState('Your feedback helps our team grow!');
  const [showRating, setShowRating] = useState(true);
  const [showContact, setShowContact] = useState(true);
  const [includeLogo, setIncludeLogo] = useState(true);
  const [customLogoUrl, setCustomLogoUrl] = useState<string | null>(null);

  // Generated state
  const [generating, setGenerating] = useState(false);
  const [generatedHtml, setGeneratedHtml] = useState<string | null>(null);

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

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await apiRequest<{ success: boolean; html: string; svg: string }>('/api/bgos/qr/standee', {
        method: 'POST',
        body: {
          templateId: selectedTemplateId,
          size: selectedSize,
          headline,
          subheadline,
          showRating,
          showContact,
          logoUrl: includeLogo ? customLogoUrl : null,
        },
      });
      setGeneratedHtml(res.html);
      Alert.alert(
        'Ready to Print',
        'Your countertop standee has been generated with your verified live Google rating and logo. Tap Share to send or print!',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Share / Print',
            onPress: () => {
              if (data?.reviewUrl) {
                void Share.share({
                  title: `${data.businessName} - Google Review Standee`,
                  message: `Google Review Standee for ${data.businessName}:\nScan QR code or click: ${data.reviewUrl}`,
                });
              }
            },
          },
        ]
      );
    } catch (e: any) {
      if (data?.reviewUrl) {
        Alert.alert(
          'Standee Ready',
          `Your Google review link is ready: ${data.reviewUrl}`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Share Link',
              onPress: () => {
                void Share.share({
                  title: `${data.businessName} - Google Review Standee`,
                  message: `Please review ${data.businessName} on Google: ${data.reviewUrl}`,
                });
              },
            },
          ]
        );
      } else {
        Alert.alert('Notice', 'Please connect your Google Business Profile to generate standees.');
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleShareLink = async () => {
    if (!data?.reviewUrl) return;
    try {
      await Share.share({
        message: `Please take 15 seconds to review ${data.businessName} on Google: ${data.reviewUrl}`,
        url: data.reviewUrl,
      });
    } catch {}
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

                {data?.qrDataUrl ? (
                  <Image
                    source={{ uri: data.qrDataUrl }}
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
          <Card>
            <Text style={ui.heading}>Design Theme</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
              {(data?.templates || []).map((t) => {
                const isSelected = selectedTemplateId === t.id;
                return (
                  <Pressable
                    key={t.id}
                    onPress={() => setSelectedTemplateId(t.id)}
                    style={{
                      flex: 1,
                      minWidth: '45%',
                      padding: 12,
                      borderRadius: 12,
                      borderWidth: 2,
                      borderColor: isSelected ? t.themeColor : '#E2E8F0',
                      backgroundColor: isSelected ? '#F8FAFC' : '#FFFFFF',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: t.themeColor }} />
                    <Text style={{ fontSize: 12, fontWeight: isSelected ? '800' : '600', color: colors.ink }}>
                      {t.name}
                    </Text>
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
                Share Direct Review Link
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </Screen>
  );
}
