import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Card, colors, ui } from '../ui';
import { GeoGridMap, type GeoGridPointItem } from './geo-grid-map';

export interface RankingsResponse {
  configured?: boolean;
  provider?: 'dataforseo' | 'google_places_grid' | 'none';
  dataForSeoConfigured?: boolean;
  placesConfigured?: boolean;
  hasGoogleConnection?: boolean;
  nativeDiscovery?: {
    updatedAt: string;
    totalViews: number;
    mapsImpressions: number;
    searchImpressions: number;
    callClicks: number;
    directionRequests: number;
    websiteClicks: number;
    keywords: Array<{ keyword: string; count: number }>;
  } | null;
  presence?: {
    mode: 'no_website' | 'bgos_hosted' | 'custom_domain';
    hostedCanonicalUrl: string;
    canonicalUrl: string | null;
    domain: string | null;
  };
  autoDefaults?: {
    placeId: string | null;
    centerLat: number | null;
    centerLng: number | null;
    suggestedKeywords: string[];
  };
  gridScans?: Array<{
    id: string;
    date: string;
    keyword: string;
    gridSize: 3 | 5;
    radiusKm: number;
    centerLat?: number | null;
    centerLng?: number | null;
    avgRank: number | null;
    top3Pct: number;
    providerMode?: string;
    points: GeoGridPointItem[];
  }>;
  organicScans?: Array<{
    id: string;
    keyword: string;
    organicRank: number | null;
    aiOverviewPresent: boolean;
    aiOverviewCited: boolean;
    citedDomains: string[];
    providerMode?: string;
  }>;
}

export function SeoGridTab({
  data,
  gridKeyword,
  setGridKeyword,
  gridSize,
  setGridSize,
  radiusKm,
  setRadiusKm,
  scanningGrid,
  scanningOrganic,
  nativeBusy,
  savingLocation,
  onRunGridScan,
  onRunOrganicCheck,
  onRefreshNative,
  onSaveGeoConfig,
  onGoToAudit,
}: {
  data?: RankingsResponse;
  gridKeyword: string;
  setGridKeyword: (val: string) => void;
  gridSize: 3 | 5;
  setGridSize: (sz: 3 | 5) => void;
  radiusKm: number;
  setRadiusKm: (r: number) => void;
  scanningGrid: boolean;
  scanningOrganic: boolean;
  nativeBusy: boolean;
  savingLocation: boolean;
  onRunGridScan: () => void;
  onRunOrganicCheck: () => void;
  onRefreshNative: () => void;
  onSaveGeoConfig: (placeId: string, lat: number, lng: number) => Promise<void>;
  onGoToAudit: () => void;
}) {
  const scans = useMemo(() => data?.gridScans || [], [data?.gridScans]);
  const [selectedScanId, setSelectedScanId] = useState<string | null>(null);
  const [showLocationForm, setShowLocationForm] = useState(false);
  const [placeInput, setPlaceInput] = useState(data?.autoDefaults?.placeId || '');
  const [latInput, setLatInput] = useState(
    data?.autoDefaults?.centerLat != null ? String(data.autoDefaults.centerLat) : '',
  );
  const [lngInput, setLngInput] = useState(
    data?.autoDefaults?.centerLng != null ? String(data.autoDefaults.centerLng) : '',
  );

  useEffect(() => {
    if (data?.autoDefaults?.placeId && !placeInput) setPlaceInput(data.autoDefaults.placeId);
    if (data?.autoDefaults?.centerLat != null && !latInput) setLatInput(String(data.autoDefaults.centerLat));
    if (data?.autoDefaults?.centerLng != null && !lngInput) setLngInput(String(data.autoDefaults.centerLng));
  }, [data?.autoDefaults, placeInput, latInput, lngInput]);

  useEffect(() => {
    if (scans.length > 0 && (!selectedScanId || !scans.some((s) => s.id === selectedScanId))) {
      setSelectedScanId(scans[0].id);
    }
  }, [scans, selectedScanId]);

  const activeGrid = useMemo(
    () => scans.find((s) => s.id === selectedScanId) || scans[0] || null,
    [scans, selectedScanId],
  );

  const missingGeoLocation =
    !data?.autoDefaults?.placeId ||
    data?.autoDefaults?.centerLat == null ||
    data?.autoDefaults?.centerLng == null;

  const isNoWebsite = data?.presence?.mode === 'no_website';
  const discovery = data?.nativeDiscovery;

  const quickChips = useMemo(() => {
    const out: string[] = [];
    const seen = new Set<string>();
    for (const k of discovery?.keywords || []) {
      const clean = k?.keyword?.trim();
      if (clean && !seen.has(clean.toLowerCase())) {
        seen.add(clean.toLowerCase());
        out.push(clean);
      }
    }
    for (const k of data?.autoDefaults?.suggestedKeywords || []) {
      const clean = k?.trim();
      if (clean && !seen.has(clean.toLowerCase())) {
        seen.add(clean.toLowerCase());
        out.push(clean);
      }
    }
    return out.slice(0, 8);
  }, [discovery?.keywords, data?.autoDefaults?.suggestedKeywords]);

  return (
    <View style={{ gap: 12 }}>
      {/* Official Google Discovery Telemetry Strip */}
      <Card style={{ gap: 10 }}>
        <View style={[ui.row, { justifyContent: 'space-between' }]}>
          <View style={{ flex: 1 }}>
            <Text style={ui.heading}>Google Search Discovery</Text>
            <Text style={{ fontSize: 11, color: colors.muted }}>
              {discovery?.updatedAt
                ? `Synced ${new Date(discovery.updatedAt).toLocaleDateString()}`
                : 'Live impressions & search terms from Google Business'}
            </Text>
          </View>
          {data?.hasGoogleConnection ? (
            <Pressable
              disabled={nativeBusy}
              onPress={onRefreshNative}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 8,
                backgroundColor: colors.soft,
              }}
            >
              {nativeBusy ? (
                <ActivityIndicator size="small" color={colors.brandDark} />
              ) : (
                <MaterialIcons name="sync" size={14} color={colors.brandDark} />
              )}
              <Text style={{ fontSize: 11, fontWeight: '800', color: colors.brandDark }}>Sync</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={{ flexDirection: 'row', gap: 6 }}>
          {[
            { k: 'Maps', v: discovery?.mapsImpressions },
            { k: 'Search', v: discovery?.searchImpressions },
            { k: 'Total Views', v: discovery?.totalViews },
            {
              k: 'Actions',
              v:
                discovery != null
                  ? (discovery.directionRequests || 0) + (discovery.callClicks || 0)
                  : undefined,
            },
          ].map((stat) => (
            <View
              key={stat.k}
              style={{
                flex: 1,
                backgroundColor: colors.background,
                borderRadius: 9,
                paddingVertical: 8,
                paddingHorizontal: 6,
                borderWidth: 1,
                borderColor: colors.line,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '900', color: colors.ink }}>
                {stat.v != null ? stat.v.toLocaleString() : '—'}
              </Text>
              <Text style={{ fontSize: 9.5, fontWeight: '700', color: colors.muted }}>{stat.k}</Text>
            </View>
          ))}
        </View>

        {quickChips.length > 0 ? (
          <View style={{ gap: 5 }}>
            <Text style={{ fontSize: 10.5, fontWeight: '800', color: colors.muted }}>
              TAP A SEARCH TERM TO TEST ON GRID:
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {quickChips.map((kw) => {
                const isSel = gridKeyword.trim().toLowerCase() === kw.toLowerCase();
                return (
                  <Pressable
                    key={kw}
                    onPress={() => setGridKeyword(kw)}
                    style={{
                      backgroundColor: isSel ? colors.brandSoft : colors.background,
                      borderWidth: 1,
                      borderColor: isSel ? colors.brand : colors.line,
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 16,
                    }}
                  >
                    <Text style={{ fontSize: 11.5, fontWeight: '700', color: isSel ? colors.brandDark : colors.ink }}>
                      {kw}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ) : null}
      </Card>

      {/* Scanner Form Card */}
      <Card style={{ gap: 10 }}>
        <View style={[ui.row, { justifyContent: 'space-between' }]}>
          <Text style={ui.heading}>Maps Area Grid &amp; Web SERP</Text>
          <View style={{ backgroundColor: colors.brandSoft, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
            <Text style={{ fontSize: 10, fontWeight: '800', color: colors.brandDark }}>
              {data?.dataForSeoConfigured
                ? 'DataForSEO SERP'
                : data?.placesConfigured
                  ? 'Places Grid (Free)'
                  : 'Provider Key Missing'}
            </Text>
          </View>
        </View>

        {!data?.configured ? (
          <View
            style={{
              backgroundColor: '#FEF2F2',
              borderRadius: 10,
              padding: 10,
              borderWidth: 1,
              borderColor: '#FECACA',
            }}
          >
            <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#B91C1C' }}>
              Server configuration required: Add a Google Places API key or DataForSEO credentials in server environment settings.
            </Text>
          </View>
        ) : missingGeoLocation ? (
          <View
            style={{
              backgroundColor: '#FFFBEB',
              borderRadius: 10,
              padding: 10,
              borderWidth: 1,
              borderColor: '#FDE68A',
              gap: 6,
            }}
          >
            <View style={[ui.row, { justifyContent: 'space-between' }]}>
              <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#92400E', flex: 1 }}>
                Place ID / Coordinates missing — tap &ldquo;Run Geo-Grid&rdquo; to auto-detect or set manually
              </Text>
              <Pressable onPress={() => setShowLocationForm((p) => !p)}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: colors.brandDark }}>
                  {showLocationForm ? 'Hide' : 'Set Manually'}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable
            onPress={() => setShowLocationForm((p) => !p)}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <Text style={{ fontSize: 11, color: colors.muted }}>
              Center: {data?.autoDefaults?.centerLat?.toFixed(4)}, {data?.autoDefaults?.centerLng?.toFixed(4)}
            </Text>
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.brandDark }}>
              {showLocationForm ? 'Hide Coordinates' : 'Edit Location'}
            </Text>
          </Pressable>
        )}

        {showLocationForm ? (
          <View
            style={{
              backgroundColor: colors.background,
              padding: 10,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: colors.line,
              gap: 8,
            }}
          >
            <TextInput
              placeholder="Google Place ID (ChIJ...)"
              placeholderTextColor={colors.muted}
              value={placeInput}
              onChangeText={setPlaceInput}
              style={ui.input}
            />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                placeholder="Latitude (e.g. 28.6139)"
                placeholderTextColor={colors.muted}
                value={latInput}
                onChangeText={setLatInput}
                keyboardType="numeric"
                style={[ui.input, { flex: 1 }]}
              />
              <TextInput
                placeholder="Longitude (e.g. 77.2090)"
                placeholderTextColor={colors.muted}
                value={lngInput}
                onChangeText={setLngInput}
                keyboardType="numeric"
                style={[ui.input, { flex: 1 }]}
              />
            </View>
            <Pressable
              disabled={savingLocation}
              onPress={() => void onSaveGeoConfig(placeInput.trim(), Number(latInput), Number(lngInput))}
              style={{
                backgroundColor: colors.ink,
                paddingVertical: 9,
                borderRadius: 8,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>
                {savingLocation ? 'Saving…' : 'Save Map Center & Place ID'}
              </Text>
            </Pressable>
          </View>
        ) : null}

        <TextInput
          placeholder="Enter target keyword (e.g. dental clinic near me)"
          placeholderTextColor={colors.muted}
          value={gridKeyword}
          onChangeText={setGridKeyword}
          style={ui.input}
        />

        <View style={{ flexDirection: 'row', gap: 6 }}>
          {([3, 5] as const).map((sz) => (
            <Pressable
              key={sz}
              onPress={() => setGridSize(sz)}
              style={{
                flex: 1,
                paddingVertical: 8,
                borderRadius: 9,
                borderWidth: 1,
                borderColor: gridSize === sz ? colors.brand : colors.line,
                backgroundColor: gridSize === sz ? colors.brandSoft : colors.surface,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '800', color: gridSize === sz ? colors.brandDark : colors.ink }}>
                {sz}×{sz} ({sz * sz} pins)
              </Text>
            </Pressable>
          ))}
          {([1.5, 3, 5] as const).map((r) => (
            <Pressable
              key={r}
              onPress={() => setRadiusKm(r)}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 8,
                borderRadius: 9,
                borderWidth: 1,
                borderColor: radiusKm === r ? colors.brand : colors.line,
                backgroundColor: radiusKm === r ? colors.brandSoft : colors.surface,
              }}
            >
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: radiusKm === r ? colors.brandDark : colors.ink }}>
                {r}km
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable
            disabled={scanningGrid || !data?.configured}
            onPress={onRunGridScan}
            style={{
              flex: 1,
              backgroundColor: data?.configured ? colors.brand : '#94A3B8',
              paddingVertical: 11,
              borderRadius: 10,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 5,
            }}
          >
            {scanningGrid ? <ActivityIndicator size="small" color="#FFFFFF" /> : <MaterialIcons name="grid-on" size={16} color="#FFFFFF" />}
            <Text style={{ color: '#FFFFFF', fontSize: 12.5, fontWeight: '800' }}>
              {scanningGrid ? 'Scanning…' : 'Run Geo-Grid'}
            </Text>
          </Pressable>

          <Pressable
            disabled={scanningOrganic || !data?.configured || isNoWebsite}
            onPress={onRunOrganicCheck}
            style={{
              flex: 1,
              backgroundColor: data?.configured && !isNoWebsite ? colors.ink : '#94A3B8',
              paddingVertical: 11,
              borderRadius: 10,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 5,
            }}
          >
            {scanningOrganic ? <ActivityIndicator size="small" color="#FFFFFF" /> : <MaterialIcons name="public" size={16} color="#FFFFFF" />}
            <Text style={{ color: '#FFFFFF', fontSize: 12.5, fontWeight: '800' }}>
              {scanningOrganic ? 'Checking…' : 'Check Web + AIO'}
            </Text>
          </Pressable>
        </View>

        {isNoWebsite ? (
          <Pressable
            onPress={onGoToAudit}
            style={{
              backgroundColor: '#FFFBEB',
              paddingHorizontal: 10,
              paddingVertical: 8,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: '#FDE68A',
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#92400E' }}>
              Web + AIO check needs an active webpage URL — Tap here to activate your free SEO Mini-Site in 1 click →
            </Text>
          </Pressable>
        ) : null}
      </Card>

      {/* Geo-Grid Visualization Card + History Switcher */}
      <Card style={{ gap: 10 }}>
        {scans.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {scans.map((s) => {
              const active = activeGrid?.id === s.id;
              return (
                <Pressable
                  key={s.id}
                  onPress={() => setSelectedScanId(s.id)}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 9,
                    borderWidth: 1,
                    borderColor: active ? colors.brand : colors.line,
                    backgroundColor: active ? colors.brandSoft : colors.background,
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '800', color: active ? colors.brandDark : colors.ink }}>
                    {s.keyword} · {s.gridSize}×{s.gridSize}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}

        <GeoGridMap
          keyword={activeGrid?.keyword}
          lastUpdated={activeGrid?.date ? new Date(activeGrid.date).toLocaleDateString() : null}
          avgRank={activeGrid?.avgRank ?? null}
          top3Pct={activeGrid?.top3Pct ?? null}
          gridSize={activeGrid?.gridSize || 3}
          radiusKm={activeGrid?.radiusKm}
          centerLat={activeGrid?.centerLat ?? data?.autoDefaults?.centerLat}
          centerLng={activeGrid?.centerLng ?? data?.autoDefaults?.centerLng}
          points={activeGrid?.points || []}
        />
      </Card>

      {/* Google Web & AI Overviews Card */}
      {(data?.organicScans?.length || 0) > 0 ? (
        <Card style={{ gap: 10 }}>
          <View style={[ui.row, { justifyContent: 'space-between' }]}>
            <Text style={ui.heading}>Google Web &amp; AI Citations</Text>
            <Text style={{ fontSize: 10.5, fontWeight: '700', color: colors.muted }}>
              {data?.dataForSeoConfigured ? 'SERP + AIO' : 'Gemini Grounded'}
            </Text>
          </View>
          {data!.organicScans!.map((o) => {
            const isGemini = o.providerMode === 'gemini_grounded_search' || (!data?.dataForSeoConfigured && o.organicRank != null);
            return (
              <View
                key={o.id}
                style={{
                  paddingVertical: 9,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.line,
                  gap: 6,
                }}
              >
                <View style={[ui.row, { justifyContent: 'space-between', gap: 8 }]}>
                  <Text style={{ fontSize: 12.5, fontWeight: '800', color: colors.ink, flex: 1 }}>{o.keyword}</Text>
                  <View
                    style={{
                      backgroundColor: o.organicRank != null ? colors.brandSoft : '#F1F5F9',
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 6,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: '800',
                        color: o.organicRank != null ? colors.brandDark : colors.muted,
                      }}
                    >
                      {o.organicRank != null
                        ? isGemini
                          ? `AI Source #${o.organicRank}`
                          : `Web #${o.organicRank}`
                        : 'Not Cited'}
                    </Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <View
                    style={{
                      backgroundColor: o.aiOverviewCited ? '#DCFCE7' : o.aiOverviewPresent ? '#FEF3C7' : '#F1F5F9',
                      paddingHorizontal: 7,
                      paddingVertical: 2,
                      borderRadius: 5,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: '800',
                        color: o.aiOverviewCited ? '#15803D' : o.aiOverviewPresent ? '#B45309' : colors.muted,
                      }}
                    >
                      {o.aiOverviewCited ? 'Cited in AI Overview' : o.aiOverviewPresent ? 'AI Overview Present' : 'No AI Sources'}
                    </Text>
                  </View>
                  {(o.citedDomains || []).slice(0, 3).map((dom) => (
                    <Text key={dom} style={{ fontSize: 10.5, color: colors.muted }}>
                      {dom}
                    </Text>
                  ))}
                </View>
              </View>
            );
          })}
        </Card>
      ) : null}
    </View>
  );
}
