import React, { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { colors } from '../ui';

export interface GeoGridPointItem {
  row: number;
  col: number;
  lat?: number;
  lng?: number;
  rank: number | null;
  isCenter?: boolean;
  topCompetitorName?: string | null;
  topCompetitorRating?: number | null;
}

export function gridTilePalette(rank: number | null): { bg: string; fg: string; border: string; label: string } {
  if (rank == null || rank <= 0) {
    return { bg: '#EF4444', fg: '#FFFFFF', border: '#DC2626', label: '20+' };
  }
  if (rank <= 3) {
    return { bg: '#84CC16', fg: '#0F172A', border: '#65A30D', label: String(rank) };
  }
  if (rank <= 10) {
    return { bg: '#EAB308', fg: '#0F172A', border: '#CA8A04', label: String(rank) };
  }
  return { bg: '#EF4444', fg: '#FFFFFF', border: '#DC2626', label: rank > 20 ? '20+' : String(rank) };
}

function escapeHtmlText(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatUpdatedDateLabel(raw?: string | null): string {
  if (!raw || raw === 'Not scanned yet') return '';
  const dt = new Date(raw);
  if (!Number.isNaN(dt.getTime())) {
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  return raw;
}

function synthesizeGridCoordinates(
  points: GeoGridPointItem[],
  gridSize: number,
  radiusKm: number,
  centerLat: number,
  centerLng: number,
): Array<GeoGridPointItem & { lat: number; lng: number }> {
  const centerIdx = Math.floor(gridSize / 2);
  const halfSteps = Math.max(1, centerIdx);
  const stepKm = radiusKm / halfSteps;
  const latDegPerKm = 1 / 111.32;
  const lngDegPerKm = 1 / (111.32 * Math.max(0.2, Math.cos((centerLat * Math.PI) / 180)));

  return points.map((p) => {
    if (typeof p.lat === 'number' && typeof p.lng === 'number' && Number.isFinite(p.lat) && Number.isFinite(p.lng)) {
      return { ...p, lat: p.lat, lng: p.lng };
    }
    const dLat = (centerIdx - p.row) * stepKm * latDegPerKm;
    const dLng = (p.col - centerIdx) * stepKm * lngDegPerKm;
    return {
      ...p,
      lat: Number((centerLat + dLat).toFixed(6)),
      lng: Number((centerLng + dLng).toFixed(6)),
    };
  });
}

function buildLeafletHtml({
  centerLat,
  centerLng,
  points,
  centerIdx,
}: {
  centerLat: number;
  centerLng: number;
  points: Array<GeoGridPointItem & { lat: number; lng: number }>;
  centerIdx: number;
}): string {
  const markerPayload = points.map((p, idx) => {
    const pal = gridTilePalette(p.rank);
    const isCenter = Boolean(p.isCenter || (p.row === centerIdx && p.col === centerIdx));
    return {
      idx,
      lat: p.lat,
      lng: p.lng,
      bg: pal.bg,
      fg: pal.fg,
      label: pal.label,
      isCenter,
      topCompetitorName: p.topCompetitorName ? escapeHtmlText(p.topCompetitorName) : '',
    };
  });

  return `<!doctype html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      background: #E2ECE5;
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif;
    }
    .leaflet-control-attribution { display: none !important; }
    .pin-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }
    .pin-circle {
      width: 28px;
      height: 28px;
      border-radius: 999px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 800;
      box-shadow: 0 2px 5px rgba(15, 23, 42, 0.25);
      border: 1.5px solid rgba(255, 255, 255, 0.85);
    }
    .your-loc-arrow {
      margin-top: 2px;
      font-size: 11px;
      line-height: 1;
      color: #0F172A;
      font-weight: 900;
      text-shadow: 0 0 3px rgba(255, 255, 255, 0.95);
    }
    .your-loc-label {
      margin-top: 1px;
      font-size: 11px;
      line-height: 1.1;
      font-weight: 800;
      color: #0F172A;
      white-space: nowrap;
      text-shadow: 0 0 4px rgba(255, 255, 255, 0.98), 0 1px 2px rgba(255, 255, 255, 0.95);
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    (function () {
      try {
        var pts = ${JSON.stringify(markerPayload)};
        var map = L.map('map', {
          zoomControl: false,
          attributionControl: false,
          dragging: true,
          scrollWheelZoom: false,
          tap: true
        }).setView([${centerLat}, ${centerLng}], 13);

        var primaryTiles = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
          maxZoom: 18,
          subdomains: 'abcd'
        });
        var fallbackAdded = false;
        primaryTiles.on('tileerror', function () {
          if (!fallbackAdded) {
            fallbackAdded = true;
            L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18 }).addTo(map);
          }
        });
        primaryTiles.addTo(map);

        var bounds = L.latLngBounds([[${centerLat}, ${centerLng}]]);
        pts.forEach(function (p) {
          bounds.extend([p.lat, p.lng]);
          var html = p.isCenter
            ? '<div class="pin-wrap"><div class="pin-circle" style="background:' + p.bg + ';color:' + p.fg + ';">' + p.label + '</div><div class="your-loc-arrow">▲</div><div class="your-loc-label">Your Location</div></div>'
            : '<div class="pin-wrap"><div class="pin-circle" style="background:' + p.bg + ';color:' + p.fg + ';">' + p.label + '</div></div>';
          var icon = L.divIcon({
            className: '',
            html: html,
            iconSize: p.isCenter ? [96, 56] : [28, 28],
            iconAnchor: p.isCenter ? [48, 14] : [14, 14]
          });
          var marker = L.marker([p.lat, p.lng], { icon: icon, zIndexOffset: p.isCenter ? 500 : 100 }).addTo(map);
          marker.on('click', function () {
            if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'select_pin', idx: p.idx }));
            }
          });
        });

        map.fitBounds(bounds, {
          paddingTopLeft: [34, 52],
          paddingBottomRight: [34, 34],
          maxZoom: 14
        });
      } catch (e) {
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'map_error' }));
        }
      }
    })();
  </script>
</body>
</html>`;
}

export function GeoGridMap({
  keyword,
  lastUpdated,
  avgRank,
  top3Pct,
  gridSize = 5,
  radiusKm,
  centerLat,
  centerLng,
  points,
  compact = false,
  onPressEmpty,
  availableKeywords,
  onSelectKeyword,
}: {
  keyword?: string | null;
  lastUpdated?: string | null;
  avgRank?: number | null;
  top3Pct?: number | null;
  gridSize?: number;
  radiusKm?: number | null;
  centerLat?: number | null;
  centerLng?: number | null;
  points: GeoGridPointItem[];
  compact?: boolean;
  onPressEmpty?: () => void;
  availableKeywords?: string[];
  onSelectKeyword?: (kw: string) => void;
}) {
  const inferredSize = useMemo(() => {
    if (gridSize === 5 || gridSize === 3) return gridSize;
    return points.length >= 25 ? 5 : 3;
  }, [gridSize, points.length]);

  const centerIdx = Math.floor(inferredSize / 2);

  const hasCenterCoords =
    typeof centerLat === 'number' &&
    typeof centerLng === 'number' &&
    Number.isFinite(centerLat) &&
    Number.isFinite(centerLng);

  const geoPoints = useMemo(() => {
    if (!hasCenterCoords || centerLat == null || centerLng == null) return [];
    return synthesizeGridCoordinates(
      points,
      inferredSize,
      typeof radiusKm === 'number' && radiusKm > 0 ? radiusKm : 3,
      centerLat,
      centerLng,
    );
  }, [hasCenterCoords, centerLat, centerLng, points, inferredSize, radiusKm]);

  const [mapFailed, setMapFailed] = useState(false);
  const [selectedPinIdx, setSelectedPinIdx] = useState<number | null>(null);
  const [keywordPickerOpen, setKeywordPickerOpen] = useState(false);

  const selectedPin =
    selectedPinIdx != null && points[selectedPinIdx] ? points[selectedPinIdx] : null;

  const updatedLabel = useMemo(() => formatUpdatedDateLabel(lastUpdated), [lastUpdated]);

  const leafletHtml = useMemo(() => {
    if (!hasCenterCoords || geoPoints.length === 0 || centerLat == null || centerLng == null) return '';
    return buildLeafletHtml({
      centerLat,
      centerLng,
      points: geoPoints,
      centerIdx,
    });
  }, [hasCenterCoords, geoPoints, centerLat, centerLng, centerIdx]);

  if (points.length === 0) {
    return (
      <View
        style={{
          backgroundColor: '#F8FAFC',
          borderRadius: 16,
          padding: compact ? 18 : 22,
          borderWidth: 1,
          borderStyle: 'dashed',
          borderColor: '#CBD5E1',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: colors.brandSoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MaterialIcons name="location-on" size={22} color={colors.brand} />
        </View>
        <Text style={{ fontSize: 14, fontWeight: '800', color: colors.ink, textAlign: 'center' }}>
          No Geo-Grid scan recorded yet
        </Text>
        <Text style={{ fontSize: 12, color: colors.muted, textAlign: 'center', lineHeight: 17 }}>
          Run a real 3×3 or 5×5 neighborhood check to map your Google Maps ranks around your business.
        </Text>
        {onPressEmpty ? (
          <Pressable
            onPress={onPressEmpty}
            style={{
              marginTop: 4,
              backgroundColor: colors.brand,
              paddingHorizontal: 14,
              paddingVertical: 9,
              borderRadius: 10,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <MaterialIcons name="radar" size={16} color="#FFFFFF" />
            <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>Open Geo-Grid Scanner</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  const canSwitchKeyword = Array.isArray(availableKeywords) && availableKeywords.length > 1 && Boolean(onSelectKeyword);
  const gridRows = Array.from({ length: inferredSize }, (_, r) => r);

  return (
    <View style={{ gap: 12 }}>
      {/* Centered Rounded Keyword Pill */}
      {keyword ? (
        <View style={{ alignItems: 'center' }}>
          <Pressable
            disabled={!canSwitchKeyword}
            onPress={() => canSwitchKeyword && setKeywordPickerOpen((prev) => !prev)}
            style={({ pressed }) => ({
              backgroundColor: '#F3F4F6',
              paddingHorizontal: 16,
              paddingVertical: 9,
              borderRadius: 22,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              maxWidth: '94%',
              opacity: pressed && canSwitchKeyword ? 0.8 : 1,
            })}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#334155', flexShrink: 1 }} numberOfLines={1}>
              Keyword: {keyword}
            </Text>
            {canSwitchKeyword ? (
              <MaterialIcons name={keywordPickerOpen ? 'expand-less' : 'expand-more'} size={17} color="#475569" />
            ) : null}
          </Pressable>

          {keywordPickerOpen && canSwitchKeyword ? (
            <View
              style={{
                marginTop: 6,
                backgroundColor: '#FFFFFF',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#E2E8F0',
                paddingVertical: 4,
                minWidth: 230,
                maxWidth: '92%',
                shadowColor: '#0F172A',
                shadowOpacity: 0.08,
                shadowRadius: 8,
                elevation: 3,
              }}
            >
              {availableKeywords!.map((kw) => {
                const isSelected = kw === keyword;
                return (
                  <Pressable
                    key={kw}
                    onPress={() => {
                      onSelectKeyword!(kw);
                      setKeywordPickerOpen(false);
                      setSelectedPinIdx(null);
                    }}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      backgroundColor: isSelected ? '#EFF6FF' : 'transparent',
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                    }}
                  >
                    <Text style={{ fontSize: 12.5, fontWeight: isSelected ? '700' : '500', color: isSelected ? '#1D4ED8' : '#334155', flex: 1 }} numberOfLines={1}>
                      {kw}
                    </Text>
                    {isSelected ? <MaterialIcons name="check" size={16} color="#1D4ED8" /> : null}
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Map-First Edge-to-Edge Street Map Container */}
      <View
        style={{
          height: compact ? 310 : 340,
          borderRadius: 16,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: '#E2E8F0',
          backgroundColor: '#E2ECE5',
          position: 'relative',
        }}
      >
        {/* Top-Left Dark Floating Last Updated Pill */}
        {updatedLabel ? (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 12,
              left: 12,
              zIndex: 20,
              backgroundColor: 'rgba(15, 23, 42, 0.88)',
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 8,
            }}
          >
            <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#FFFFFF' }}>
              Last updated on {updatedLabel}
            </Text>
          </View>
        ) : null}

        {hasCenterCoords && !mapFailed && leafletHtml ? (
          <WebView
            originWhitelist={['*']}
            source={{ html: leafletHtml }}
            style={{ flex: 1, backgroundColor: '#E2ECE5' }}
            scrollEnabled={false}
            onError={() => setMapFailed(true)}
            onMessage={(ev) => {
              try {
                const payload = JSON.parse(ev.nativeEvent.data);
                if (payload?.type === 'select_pin' && typeof payload.idx === 'number') {
                  setSelectedPinIdx(payload.idx);
                } else if (payload?.type === 'map_error') {
                  setMapFailed(true);
                }
              } catch {}
            }}
          />
        ) : (
          /* Clean Offline/Coordinate-Free Map-Style Pin Canvas matching Screenshot Aesthetics */
          <View
            style={{
              flex: 1,
              backgroundColor: '#E6F1E6',
              justifyContent: 'center',
              paddingHorizontal: 16,
              paddingTop: updatedLabel ? 42 : 16,
              paddingBottom: 16,
              gap: inferredSize === 5 ? 12 : 18,
            }}
          >
            {gridRows.map((row) => (
              <View
                key={`row-${row}`}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-around',
                  alignItems: 'flex-start',
                }}
              >
                {gridRows.map((col) => {
                  const ptIdx = points.findIndex((p) => p.row === row && p.col === col);
                  const pt = ptIdx >= 0 ? points[ptIdx] : null;
                  const isCenter = Boolean(pt?.isCenter || (row === centerIdx && col === centerIdx));
                  const rank = typeof pt?.rank === 'number' && pt.rank > 0 ? pt.rank : null;
                  const pal = gridTilePalette(rank);

                  return (
                    <Pressable
                      key={`cell-${row}-${col}`}
                      onPress={() => ptIdx >= 0 && setSelectedPinIdx(ptIdx)}
                      style={{ alignItems: 'center', minWidth: 36 }}
                    >
                      <View
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: 15,
                          backgroundColor: pal.bg,
                          borderWidth: 1.5,
                          borderColor: 'rgba(255,255,255,0.9)',
                          alignItems: 'center',
                          justifyContent: 'center',
                          shadowColor: '#0F172A',
                          shadowOpacity: 0.18,
                          shadowRadius: 3,
                          elevation: 2,
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '800', color: pal.fg }}>
                          {pt ? pal.label : '—'}
                        </Text>
                      </View>
                      {isCenter ? (
                        <View style={{ alignItems: 'center', marginTop: 2 }}>
                          <Text style={{ fontSize: 10, fontWeight: '900', color: '#0F172A', lineHeight: 11 }}>▲</Text>
                          <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#0F172A', lineHeight: 13 }}>
                            Your Location
                          </Text>
                        </View>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Pin Detail Inspector (shown cleanly below map only when a user taps a pin) */}
      {selectedPin ? (
        <View
          style={{
            backgroundColor: '#F8FAFC',
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 9,
            borderWidth: 1,
            borderColor: '#E2E8F0',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#0F172A' }}>
              {selectedPin.isCenter ? 'Your Location' : `Grid Pin (${selectedPin.row + 1}, ${selectedPin.col + 1})`}
              {selectedPin.rank != null && selectedPin.rank > 0 ? ` · Rank #${selectedPin.rank}` : ' · Outside Top 20'}
            </Text>
            {selectedPin.topCompetitorName ? (
              <Text style={{ fontSize: 11, color: '#64748B', marginTop: 1 }} numberOfLines={1}>
                Top nearby: {selectedPin.topCompetitorName}
                {selectedPin.topCompetitorRating ? ` (${selectedPin.topCompetitorRating.toFixed(1)}★)` : ''}
              </Text>
            ) : avgRank != null ? (
              <Text style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>
                Grid Avg: #{avgRank} · Top 3 Coverage: {top3Pct ?? 0}%
              </Text>
            ) : null}
          </View>
          <Pressable onPress={() => setSelectedPinIdx(null)} hitSlop={8}>
            <MaterialIcons name="close" size={16} color="#64748B" />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
