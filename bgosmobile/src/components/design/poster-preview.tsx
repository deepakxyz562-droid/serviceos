import React, { useState } from 'react';
import { Image, PixelRatio, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { PROFESSIONAL_ASSETS } from './professional-assets';
import { WEB_URL } from '../../lib/constants';
import type { MarketingDesign } from '../../../../shared/marketing-design';

function getEmblemIconName(id: string, src?: string): keyof typeof MaterialIcons.glyphMap {
  const s = `${id} ${src || ''}`.toLowerCase();
  if (s.includes('chef') || s.includes('food') || s.includes('catering') || s.includes('cloche')) return 'restaurant';
  if (s.includes('diya') || s.includes('flame') || s.includes('fire')) return 'local-fire-department';
  if (s.includes('moon') || s.includes('crescent') || s.includes('eid')) return 'brightness-3';
  if (s.includes('ganesha') || s.includes('lotus') || s.includes('festive') || s.includes('gift')) return 'celebration';
  if (s.includes('bolt') || s.includes('lightning') || s.includes('flash')) return 'bolt';
  if (s.includes('shield') || s.includes('auto') || s.includes('detailing')) return 'verified-user';
  if (s.includes('building') || s.includes('primehome') || s.includes('realty') || s.includes('estate')) return 'apartment';
  if (s.includes('medical') || s.includes('clinic') || s.includes('cross') || s.includes('health')) return 'local-hospital';
  if (s.includes('salon') || s.includes('sparkle') || s.includes('luxe')) return 'spa';
  return 'auto-awesome';
}

/** One responsive renderer for native gallery and selected-poster previews. */
export function PosterPreview({ doc }: { doc: MarketingDesign }) {
  const [width, setWidth] = useState(0),
    [failed, setFailed] = useState<Record<string, boolean>>({});
  const [fonts] = useFonts({
    BgosDesign: require('../../../assets/fonts/BgosDesign-Regular.ttf'),
    BgosDesignBold: require('../../../assets/fonts/BgosDesign-Bold.ttf'),
    BgosEditorial: require('../../../assets/fonts/BgosEditorial.ttf'),
    BgosDisplay: require('../../../assets/fonts/BgosDisplay.ttf'),
  });
  const scale = width / doc.width;

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{
        width: '100%',
        aspectRatio: doc.width / doc.height,
        backgroundColor: doc.background,
        overflow: 'hidden',
      }}
    >
      {width > 0 &&
        doc.layers
          .filter((l) => !l.hidden)
          .map((l) => {
            const style = {
              position: 'absolute' as const,
              left: l.x * scale,
              top: l.y * scale,
              width: l.width * scale,
              height: l.height * scale,
              backgroundColor: l.background,
              opacity: l.opacity,
              borderRadius: (l.borderRadius || 0) * scale,
              borderWidth: (l.borderWidth || 0) * scale,
              borderColor: l.borderColor,
              overflow: 'hidden' as const,
              transform: [{ rotate: `${l.rotation || 0}deg` }],
            };

            // Dedicated vector divider rendering
            if (l.id === 'graphic_divider' || l.id.includes('divider')) {
              const lineColor = l.color && l.color !== '#000000' && l.color !== 'transparent' ? l.color : '#DFB743';
              return (
                <View key={l.id} style={[style, { justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' }]}>
                  <View style={{ width: '85%', height: Math.max(1.5, 2 * scale), backgroundColor: lineColor, opacity: 0.9, borderRadius: 1 }} />
                  <View style={{ position: 'absolute', width: 7 * scale, height: 7 * scale, backgroundColor: '#FFF6D1', borderRadius: 2, transform: [{ rotate: '45deg' }] }} />
                </View>
              );
            }

            // Dedicated vector emblem rendering for SVG data URIs
            if (l.type === 'image' && l.src?.startsWith('data:image/svg+xml')) {
              const iconName = getEmblemIconName(l.id, l.src);
              const iconSize = Math.max(14, Math.min(l.width, l.height) * scale * 0.72);
              const iconColor = l.color && l.color !== '#000000' && l.color !== 'transparent' ? l.color : '#DFB743';
              return (
                <View key={l.id} style={[style, { justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' }]}>
                  <MaterialIcons name={iconName} size={iconSize} color={iconColor} />
                </View>
              );
            }

            if (l.type === 'image') {
              const isCutoutOrEmblem =
                l.src?.startsWith('data:image/png;base64') ||
                l.src?.startsWith('data:image/svg+xml') ||
                l.id.includes('cutout') ||
                l.id.includes('emblem') ||
                l.id.includes('logo');

              return (
                <View key={l.id} style={style}>
                  {failed[l.src || ''] ? (
                    <Text style={{ fontSize: Math.max(8, 20 * scale), color: '#334155', padding: 8 }}>
                      Image unavailable · replace photo
                    </Text>
                  ) : (
                    <Image
                      source={
                        PROFESSIONAL_ASSETS[l.src || ''] || {
                          uri: l.src?.startsWith('/images/bgos/templates/')
                            ? `${WEB_URL.replace(/\/$/, '')}${l.src}`
                            : l.src?.startsWith('https://images.unsplash.com/')
                            ? l.src.replace(/w=\d+/, `w=${Math.min(2160, Math.max(360, Math.round(width * PixelRatio.get())))}`)
                            : l.src,
                        }
                      }
                      onError={() => setFailed((p) => ({ ...p, [l.src || '']: true }))}
                      style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: (l.borderRadius || 0) * scale,
                      }}
                      resizeMode={isCutoutOrEmblem ? 'contain' : 'cover'}
                    />
                  )}
                </View>
              );
            }

            return (
              <View key={l.id} style={style}>
                {l.type === 'text' && fonts && (
                  <Text
                    style={{
                      color: l.color,
                      fontFamily:
                        l.fontFamily === 'editorial'
                          ? 'BgosEditorial'
                          : l.fontFamily === 'display'
                          ? 'BgosDisplay'
                          : Number(l.fontWeight || 400) >= 600
                          ? 'BgosDesignBold'
                          : 'BgosDesign',
                      fontSize: l.fontSize * scale,
                      lineHeight: l.fontSize * scale * (l.lineHeight ?? 1.15),
                      textAlign: l.textAlign || 'left',
                      includeFontPadding: false,
                      letterSpacing: Number(l.letterSpacing || 0) * scale,
                    }}
                  >
                    {l.text}
                  </Text>
                )}
              </View>
            );
          })}
    </View>
  );
}
