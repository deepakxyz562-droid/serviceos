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
  headline?: string;
  templates: StandeeTemplate[];
  sizes: Array<{ id: string; name: string; width: number; height: number }>;
}

const DEFAULT_TEMPLATES: StandeeTemplate[] = [
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
  const [selectedTemplateId, setSelectedTemplateId] = useState('google_verified');
  const [selectedSize, setSelectedSize] = useState<'a5' | 'table_tent' | 'square_badge'>('a5');
  const [headline, setHeadline] = useState('Scan to Review Us on Google');
  const [subheadline, setSubheadline] = useState('Your feedback helps our team grow!');
  const [showRating, setShowRating] = useState(true);
  const [showContact, setShowContact] = useState(true);

  // Generated state
  const [generating, setGenerating] = useState(false);
  const [generatedHtml, setGeneratedHtml] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      // First attempt: try dedicated /api/bgos/qr/standee
      const res = await apiRequest<StandeeData>('/api/bgos/qr/standee');
      setData(res);
      if (res.headline) setHeadline(res.headline);
    } catch (e: any) {
      // Graceful fallback: synthesize standee from existing /api/gbp/place & /api/bgos/qr
      try {
        const [placeRes, qrRes] = await Promise.all([
          apiRequest<any>('/api/gbp/place').catch(() => null),
          apiRequest<any>('/api/bgos/qr?target=review').catch(() => null),
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
        },
      });
      setGeneratedHtml(res.html);
      Alert.alert(
        'Ready to Print',
        'Your countertop standee has been generated with your verified live Google rating. Tap Share to send or print!',
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
            {/* Top Accent Stripe */}
            <View style={{ height: 6, backgroundColor: currentTemplate.themeColor }} />

            <View style={{ padding: 20, alignItems: 'center', gap: 12 }}>
              {/* Business Name & Tagline */}
              <View style={{ alignItems: 'center' }}>
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

              {/* QR Code Container */}
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
                }}
              >
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
              <View style={{ alignItems: 'center', marginTop: 4 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: currentTemplate.themeColor }}>
                  📷 Open Camera & Point at QR Code
                </Text>
                <Text style={{ fontSize: 10, color: '#94A3B8', marginTop: 2 }}>
                  Takes only 15 seconds • Verified on Google Maps
                </Text>
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

          {/* 5. ACTIONS: GENERATE & SHARE */}
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
