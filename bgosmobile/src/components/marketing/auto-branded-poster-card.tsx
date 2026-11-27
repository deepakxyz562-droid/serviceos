import React from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { PosterPreview } from '../design/poster-preview';
import {
  createCommercialPosterDesign,
  COMMERCIAL_THEMES,
  type MarketingDesign,
  type CommercialTheme,
  type PosterTemplateLayout,
} from '../../../../shared/marketing-design';

export interface AutoBrandedPosterCardProps {
  document?: MarketingDesign;
  photoUri?: string | null;
  headline: string;
  subtitle?: string;
  badge: string;
  ctaText: string;
  businessName: string;
  phone?: string;
  website?: string;
  logoUri?: string | null;
  tagline?: string;
  height?: number;
  aspectRatio?: number;
  isGenerating?: boolean;
  generatingText?: string;
  theme?: CommercialTheme | string;
  layout?: PosterTemplateLayout;
}

export function AutoBrandedPosterCard({
  document,
  photoUri,
  headline,
  subtitle,
  badge,
  ctaText,
  businessName,
  phone,
  website,
  logoUri,
  height = 360,
  aspectRatio = 4 / 5,
  isGenerating = false,
  generatingText,
  theme = 'royal_gold',
  layout = 'bold_offer',
}: AutoBrandedPosterCardProps) {
  if (document) {
    return (
      <View style={{ height, aspectRatio: document.width / document.height, alignSelf: 'center' }}>
        <PosterPreview doc={document} />
      </View>
    );
  }
  if (['studio_', 'professional_', 'business_', 'kit_'].some((prefix) => layout.startsWith(prefix))) {
    const ratio = aspectRatio === 1 ? '1:1' : aspectRatio < 0.6 ? '9:16' : aspectRatio > 1 ? '16:9' : '4:5';
    const doc = createCommercialPosterDesign({
      brand: businessName,
      headline,
      subtitle,
      badge,
      cta: ctaText,
      photo: photoUri || undefined,
      logoUrl: logoUri || undefined,
      website,
      phone,
      ratio,
      theme,
      layout,
    });
    return (
      <View style={{ height, aspectRatio, alignSelf: 'center' }}>
        <PosterPreview doc={doc} />
        {isGenerating && <ActivityIndicator style={{ position: 'absolute', top: 12, right: 12 }} />}
      </View>
    );
  }
  const isCompact = height < 260;
  const cleanWeb = website ? website.replace(/^https?:\/\//, '').replace(/\/$/, '') : '';
  const initial = (businessName || 'B').trim().charAt(0).toUpperCase();
  const themeConfig = COMMERCIAL_THEMES[theme as CommercialTheme] || COMMERCIAL_THEMES.royal_gold;

  return (
    <View
      style={{
        height,
        aspectRatio,
        alignSelf: 'center',
        borderRadius: isCompact ? 14 : 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor:
          layout === 'minimal_luxury'
            ? 'rgba(217, 180, 114, 0.55)'
            : layout === 'tech_modern'
              ? 'rgba(56, 189, 248, 0.45)'
              : layout === 'urgent_callout'
                ? 'rgba(239, 68, 68, 0.4)'
                : 'rgba(255,255,255,0.12)',
        backgroundColor: '#090D16',
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowRadius: 14,
        elevation: 6,
        position: 'relative',
      }}
    >
      {layout === 'split_card' ? (
        <View style={{ flex: 1 }}>
          <View style={{ height: '52%', width: '100%', overflow: 'hidden' }}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            ) : (
              <View
                style={{
                  width: '100%',
                  height: '100%',
                  backgroundColor: themeConfig.accent || '#0F172A',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MaterialIcons name="photo-library" size={28} color="rgba(255,255,255,0.6)" />
              </View>
            )}
          </View>
          <View
            style={{
              flex: 1,
              backgroundColor: themeConfig.scrimBg,
              paddingHorizontal: isCompact ? 10 : 14,
              paddingTop: isCompact ? 8 : 10,
              paddingBottom: isCompact ? 8 : 10,
              justifyContent: 'space-between',
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View
                style={{
                  backgroundColor: themeConfig.badgeBg,
                  paddingHorizontal: isCompact ? 8 : 10,
                  paddingVertical: isCompact ? 3 : 4,
                  borderRadius: 16,
                }}
              >
                <Text
                  style={{
                    color: themeConfig.badgeText,
                    fontSize: isCompact ? 8 : 9.5,
                    fontWeight: '900',
                    letterSpacing: 0.5,
                    textTransform: 'uppercase',
                  }}
                >
                  {badge || 'SPECIAL OFFER'}
                </Text>
              </View>
              <Text numberOfLines={1} style={{ color: '#FFFFFF', fontSize: isCompact ? 9 : 11, fontWeight: '800' }}>
                {businessName || 'Brand'}
              </Text>
            </View>

            <Text
              numberOfLines={2}
              style={{
                color: '#FFFFFF',
                fontSize: isCompact ? 12 : 15,
                fontWeight: '900',
                lineHeight: isCompact ? 16 : 20,
              }}
            >
              {headline || 'Professional Business Services'}
            </Text>

            {subtitle ? (
              <Text numberOfLines={1} style={{ color: themeConfig.subColor || '#94A3B8', fontSize: isCompact ? 8.5 : 10.5, fontWeight: '700' }}>
                {subtitle}
              </Text>
            ) : null}

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 6 }}>
              <Text numberOfLines={1} style={{ color: '#94A3B8', fontSize: isCompact ? 7.5 : 9, fontWeight: '600', flex: 1, marginRight: 8 }}>
                {cleanWeb || businessName}
              </Text>
              <View style={{ backgroundColor: themeConfig.ctaBg, paddingHorizontal: isCompact ? 8 : 12, paddingVertical: isCompact ? 3.5 : 5, borderRadius: 16 }}>
                <Text style={{ color: themeConfig.ctaText, fontSize: isCompact ? 8 : 10, fontWeight: '900' }}>
                  {ctaText ? `${ctaText} →` : 'VISIT STORE →'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      ) : (
        <>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          ) : (
            <View style={{ width: '100%', height: '100%', backgroundColor: themeConfig.scrimBg || '#0F172A' }} />
          )}

          {layout === 'urgent_callout' ? (
            <View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                backgroundColor: '#DC2626',
                paddingVertical: isCompact ? 4 : 7,
                paddingHorizontal: 10,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                zIndex: 3,
              }}
            >
              <MaterialIcons name="bolt" size={isCompact ? 12 : 15} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontSize: isCompact ? 8.5 : 11, fontWeight: '900', letterSpacing: 0.6, textTransform: 'uppercase' }}>
                {badge || '24/7 RAPID SERVICE'} • CALL NOW 📞
              </Text>
            </View>
          ) : layout === 'minimal_luxury' ? (
            <View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                paddingHorizontal: isCompact ? 12 : 16,
                paddingVertical: isCompact ? 8 : 12,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                zIndex: 3,
              }}
            >
              <Text
                numberOfLines={1}
                style={{
                  color: '#D4AF37',
                  fontSize: isCompact ? 10 : 12,
                  fontWeight: '900',
                  letterSpacing: 2.2,
                  textTransform: 'uppercase',
                  flex: 1,
                  textAlign: logoUri ? 'left' : 'center',
                }}
              >
                {businessName || 'LUXURY ATELIER'}
              </Text>
              {logoUri ? (
                <Image
                  source={{ uri: logoUri }}
                  style={{
                    width: isCompact ? 22 : 28,
                    height: isCompact ? 22 : 28,
                    borderRadius: 14,
                    backgroundColor: 'rgba(255,255,255,0.95)',
                    borderWidth: 1,
                    borderColor: 'rgba(212, 175, 55, 0.8)',
                  }}
                  resizeMode="cover"
                />
              ) : null}
            </View>
          ) : (
            <View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                paddingHorizontal: isCompact ? 10 : 14,
                paddingVertical: isCompact ? 8 : 12,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: layout === 'tech_modern' ? 'rgba(11,15,25,0.45)' : 'rgba(0,0,0,0.18)',
              }}
            >
              <View
                style={{
                  backgroundColor: themeConfig.badgeBg,
                  paddingHorizontal: isCompact ? 8 : 12,
                  paddingVertical: isCompact ? 3.5 : 5,
                  borderRadius: 20,
                  shadowColor: '#000',
                  shadowOpacity: 0.35,
                  shadowRadius: 5,
                  elevation: 3,
                  borderWidth: 1,
                  borderColor: layout === 'tech_modern' ? '#38BDF8' : 'rgba(255,255,255,0.25)',
                }}
              >
                <Text
                  style={{
                    color: themeConfig.badgeText,
                    fontSize: isCompact ? 8.5 : 10.5,
                    fontWeight: '900',
                    letterSpacing: 0.8,
                    textTransform: 'uppercase',
                  }}
                >
                  {badge || 'SPECIAL OFFER'}
                </Text>
              </View>

              {logoUri ? (
                <Image
                  source={{ uri: logoUri }}
                  style={{
                    width: isCompact ? 22 : 28,
                    height: isCompact ? 22 : 28,
                    borderRadius: 6,
                    backgroundColor: 'rgba(255,255,255,0.95)',
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.4)',
                  }}
                  resizeMode="cover"
                />
              ) : null}
            </View>
          )}

          <View
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor:
                layout === 'urgent_callout'
                  ? 'rgba(15,3,3,0.85)'
                  : layout === 'tech_modern'
                    ? 'rgba(5, 11, 26, 0.92)'
                    : layout === 'minimal_luxury'
                      ? 'rgba(9, 8, 7, 0.88)'
                      : 'rgba(7, 10, 19, 0.78)',
              paddingHorizontal: isCompact ? 12 : 16,
              paddingTop: isCompact ? 10 : 14,
              paddingBottom: isCompact ? 10 : 14,
              borderTopLeftRadius: isCompact ? 14 : 18,
              borderTopRightRadius: isCompact ? 14 : 18,
              borderTopWidth: 1,
              borderTopColor:
                layout === 'urgent_callout'
                  ? 'rgba(239,68,68,0.3)'
                  : layout === 'tech_modern'
                    ? 'rgba(56, 189, 248, 0.35)'
                    : layout === 'minimal_luxury'
                      ? 'rgba(217, 180, 114, 0.35)'
                      : 'rgba(255,255,255,0.14)',
              shadowColor: '#000',
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 5,
            }}
          >
            {layout === 'minimal_luxury' ? (
              <Text
                style={{
                  color: '#D4AF37',
                  fontSize: isCompact ? 8.5 : 10.5,
                  fontWeight: '900',
                  letterSpacing: 2,
                  textAlign: 'center',
                  textTransform: 'uppercase',
                  marginBottom: 4,
                }}
              >
                — {badge || 'EXCLUSIVE COLLECTION'} —
              </Text>
            ) : null}

            <Text
              numberOfLines={2}
              style={{
                color: '#FFFFFF',
                fontSize: isCompact ? 13 : 17,
                fontWeight: '900',
                lineHeight: isCompact ? 17 : 23,
                letterSpacing: layout === 'minimal_luxury' ? 0.3 : -0.4,
                textAlign: layout === 'minimal_luxury' ? 'center' : 'left',
                textShadowColor: 'rgba(0,0,0,0.9)',
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 6,
              }}
            >
              {headline || 'Professional Business Services'}
            </Text>

            {subtitle ? (
              <Text
                numberOfLines={1}
                style={{
                  color:
                    layout === 'urgent_callout'
                      ? '#FCA5A5'
                      : layout === 'minimal_luxury'
                        ? '#E5D6B8'
                        : layout === 'tech_modern'
                          ? '#38BDF8'
                          : themeConfig.subColor || '#94A3B8',
                  fontSize: isCompact ? 9 : 11.5,
                  fontWeight: '700',
                  marginTop: 3,
                  textAlign: layout === 'minimal_luxury' ? 'center' : 'left',
                  textShadowColor: 'rgba(0,0,0,0.85)',
                  textShadowOffset: { width: 0, height: 1 },
                  textShadowRadius: 4,
                }}
              >
                {subtitle}
              </Text>
            ) : null}

            {layout === 'tech_modern' ? (
              <Text
                numberOfLines={1}
                style={{
                  color: '#38BDF8',
                  fontSize: isCompact ? 7.5 : 9,
                  fontWeight: '800',
                  marginTop: 3,
                  letterSpacing: 0.5,
                }}
              >
                ⚡ FAST SETUP  •  🛡️ ENTERPRISE READY  •  📱 LIVE SYNC
              </Text>
            ) : null}

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: isCompact ? 8 : 12,
                paddingTop: isCompact ? 6 : 8,
                borderTopWidth: 1,
                borderTopColor: 'rgba(255,255,255,0.1)',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0, paddingRight: 8 }}>
                <View
                  style={{
                    width: isCompact ? 20 : 24,
                    height: isCompact ? 20 : 24,
                    borderRadius: 12,
                    backgroundColor:
                      layout === 'urgent_callout'
                        ? '#DC2626'
                        : layout === 'tech_modern'
                          ? '#0284C7'
                          : layout === 'minimal_luxury'
                            ? '#D4AF37'
                            : themeConfig.accent,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 6,
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: isCompact ? 9.5 : 12 }}>
                    {initial}
                  </Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={{ color: '#FFFFFF', fontSize: isCompact ? 9.5 : 11.5, fontWeight: '800' }}>
                    {businessName || 'Commercial Brand'}
                  </Text>
                  {cleanWeb ? (
                    <Text numberOfLines={1} style={{ color: '#94A3B8', fontSize: isCompact ? 7.5 : 9, fontWeight: '600' }}>
                      {cleanWeb}
                    </Text>
                  ) : null}
                </View>
              </View>

              <View
                style={{
                  backgroundColor:
                    layout === 'urgent_callout'
                      ? '#DC2626'
                      : layout === 'tech_modern'
                        ? '#38BDF8'
                        : layout === 'minimal_luxury'
                          ? '#D4AF37'
                          : themeConfig.ctaBg,
                  paddingHorizontal: isCompact ? 8 : 12,
                  paddingVertical: isCompact ? 4 : 6,
                  borderRadius: 20,
                  shadowColor: layout === 'tech_modern' ? '#38BDF8' : themeConfig.accent,
                  shadowOpacity: 0.35,
                  shadowRadius: 4,
                  elevation: 2,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 3,
                }}
              >
                <Text
                  style={{
                    color:
                      layout === 'tech_modern' || layout === 'minimal_luxury'
                        ? '#090807'
                        : themeConfig.ctaText,
                    fontSize: isCompact ? 8 : 10,
                    fontWeight: '900',
                    letterSpacing: layout === 'minimal_luxury' ? 0.8 : 0.3,
                  }}
                >
                  {ctaText ? `${ctaText} →` : layout === 'urgent_callout' ? 'CALL NOW 📞' : 'VISIT STORE →'}
                </Text>
              </View>
            </View>
          </View>
        </>
      )}

      {isGenerating && (
        <View
          style={{
            ...StyleSheet.absoluteFill,
            backgroundColor: 'rgba(9, 13, 22, 0.85)',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 12,
            zIndex: 10,
          }}
        >
          <ActivityIndicator size="small" color={themeConfig.accent} />
          <Text style={{ color: '#FFFFFF', fontSize: isCompact ? 9.5 : 11, fontWeight: '700', marginTop: 6, textAlign: 'center' }}>
            {generatingText || 'AI Rendering Visual...'}
          </Text>
        </View>
      )}
    </View>
  );
}
