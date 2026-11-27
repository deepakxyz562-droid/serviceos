import React, { useState } from 'react';
import { Linking, Pressable, Share, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Screen, Card, Action, Badge, ErrorNotice, Loading, ui, colors } from '../src/components/ui';
import { useResource } from '../src/hooks/use-resource';
import { apiRequest } from '../src/lib/api';
import { withProtectedRoute } from '../src/components/navigation/protected-route';

type CitationStatus = 'listed' | 'pending' | 'needs_fix';

interface CitationDirectoryItem {
  id: string;
  name: string;
  region: 'IN' | 'GLOBAL';
  priority: 'High' | 'Medium';
  categoryTag: string;
  submitUrl: string;
  searchUrl: string;
  status: CitationStatus;
  listedUrl?: string | null;
}

interface CitationsResponse {
  success: boolean;
  napKit: {
    name: string;
    category: string;
    address: string;
    city: string;
    phone: string;
    website: string;
    description: string;
  };
  summary: {
    listedCount: number;
    totalDirectories: number;
    completionPct: number;
  };
  directories: CitationDirectoryItem[];
}

function CitationsHubScreen() {
  const citationsRes = useResource<CitationsResponse>('/api/gbp/citations');
  const [filter, setFilter] = useState<'all' | 'high' | 'pending' | 'listed'>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const data = citationsRes.data;
  const dirs = data?.directories || [];
  const filteredDirs = dirs.filter((d) => {
    if (filter === 'high') return d.priority === 'High';
    if (filter === 'pending') return d.status !== 'listed';
    if (filter === 'listed') return d.status === 'listed';
    return true;
  });

  async function cycleStatus(item: CitationDirectoryItem) {
    const next: CitationStatus =
      item.status === 'listed' ? 'pending' : item.status === 'pending' ? 'listed' : 'listed';
    setUpdatingId(item.id);
    setError(null);
    try {
      await apiRequest('/api/gbp/citations', {
        method: 'PATCH',
        body: { id: item.id, status: next },
      });
      await citationsRes.refresh();
    } catch (e) {
      setError((e as Error).message || 'Could not update directory status');
    } finally {
      setUpdatingId(null);
    }
  }

  function handleShareNapKit() {
    if (!data?.napKit) return;
    const n = data.napKit;
    const text = [
      `Business Name: ${n.name}`,
      `Category: ${n.category}`,
      `Address: ${n.address || n.city}`,
      `Phone: ${n.phone}`,
      n.website ? `Website: ${n.website}` : '',
      n.description ? `Description: ${n.description}` : '',
    ]
      .filter(Boolean)
      .join('\n');
    void Share.share({ title: `${n.name} NAP Kit`, message: text });
  }

  return (
    <Screen
      title="Citations & NAP Hub"
      subtitle="Keep Business Name, Address & Phone consistent across directories."
      showBack
      onRefresh={citationsRes.refresh}
    >
      <ErrorNotice message={error || citationsRes.error} retry={citationsRes.refresh} />

      {citationsRes.loading && !data ? (
        <Loading />
      ) : (
        <>
          {/* Progress Overview */}
          <Card style={{ gap: 10 }}>
            <View style={[ui.row, { justifyContent: 'space-between' }]}>
              <View style={{ flex: 1 }}>
                <Text style={ui.heading}>Directory Consistency Score</Text>
                <Text style={ui.caption}>
                  {data?.summary.listedCount ?? 0} of {data?.summary.totalDirectories ?? 0} core directories marked listed
                </Text>
              </View>
              <Badge
                success={(data?.summary.completionPct ?? 0) >= 60}
                accent={(data?.summary.completionPct ?? 0) < 60}
                label={`${data?.summary.completionPct ?? 0}%`}
              />
            </View>
            <View style={{ height: 8, backgroundColor: '#E2E8F0', borderRadius: 4, overflow: 'hidden' }}>
              <View
                style={{
                  width: `${data?.summary.completionPct ?? 0}%`,
                  height: '100%',
                  backgroundColor: colors.brand,
                }}
              />
            </View>
          </Card>

          {/* Canonical NAP Kit */}
          {data?.napKit ? (
            <Card style={{ gap: 8, backgroundColor: '#F8FAFC' }}>
              <View style={[ui.row, { justifyContent: 'space-between' }]}>
                <Text style={ui.heading}>Official Copy-Paste NAP Kit</Text>
                <Pressable onPress={handleShareNapKit} hitSlop={8}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: colors.brand }}>Share / Copy →</Text>
                </Pressable>
              </View>
              <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.ink }}>{data.napKit.name}</Text>
              <Text style={{ fontSize: 11.5, color: colors.muted }}>{data.napKit.address || data.napKit.city || 'Add street address in Manage Profile'}</Text>
              <Text style={{ fontSize: 11.5, color: colors.muted }}>
                {data.napKit.phone || 'No phone set'}{data.napKit.website ? ` · ${data.napKit.website}` : ''}
              </Text>
              <Action secondary compact icon="content-copy" label="Share / Copy Full NAP Details" onPress={handleShareNapKit} />
            </Card>
          ) : null}

          {/* Filter Pills */}
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {(
              [
                { id: 'all', label: `All (${dirs.length})` },
                { id: 'high', label: 'High Priority' },
                { id: 'pending', label: 'To List' },
                { id: 'listed', label: 'Listed ✓' },
              ] as const
            ).map((f) => {
              const active = filter === f.id;
              return (
                <Pressable
                  key={f.id}
                  onPress={() => setFilter(f.id)}
                  style={{
                    flex: 1,
                    paddingVertical: 7,
                    borderRadius: 10,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: active ? colors.brand : colors.line,
                    backgroundColor: active ? colors.brandSoft : '#FFFFFF',
                  }}
                >
                  <Text numberOfLines={1} style={{ fontSize: 11, fontWeight: '800', color: active ? colors.brandDark : colors.muted }}>
                    {f.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Directory Checklist */}
          <View style={{ gap: 10 }}>
            {filteredDirs.map((dir) => {
              const listed = dir.status === 'listed';
              return (
                <Card key={dir.id} style={{ gap: 8 }}>
                  <View style={[ui.row, { justifyContent: 'space-between', alignItems: 'flex-start' }]}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Text style={{ fontSize: 14, fontWeight: '800', color: colors.ink }}>{dir.name}</Text>
                        <Badge label={dir.region} accent={dir.region === 'IN'} />
                        {dir.priority === 'High' ? <Badge label="High Impact" /> : null}
                      </View>
                      <Text style={{ fontSize: 11.5, color: colors.muted }}>{dir.categoryTag}</Text>
                    </View>
                    <Pressable
                      disabled={updatingId === dir.id}
                      onPress={() => void cycleStatus(dir)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 10,
                        backgroundColor: listed ? '#DCFCE7' : '#F1F5F9',
                        borderWidth: 1,
                        borderColor: listed ? '#86EFAC' : '#CBD5E1',
                      }}
                    >
                      <MaterialIcons
                        name={listed ? 'check-circle' : 'radio-button-unchecked'}
                        size={15}
                        color={listed ? '#16A34A' : '#64748B'}
                      />
                      <Text style={{ fontSize: 11.5, fontWeight: '800', color: listed ? '#15803D' : '#475569' }}>
                        {updatingId === dir.id ? 'Saving…' : listed ? 'Listed' : 'Mark Listed'}
                      </Text>
                    </Pressable>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Pressable
                      onPress={() => void Linking.openURL(dir.submitUrl)}
                      style={{
                        flex: 1,
                        paddingVertical: 8,
                        borderRadius: 8,
                        backgroundColor: colors.brandSoft,
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'row',
                        gap: 4,
                      }}
                    >
                      <MaterialIcons name="add-business" size={14} color={colors.brandDark} />
                      <Text style={{ fontSize: 11.5, fontWeight: '800', color: colors.brandDark }}>
                        {listed ? 'Manage Listing' : 'Add / Claim'}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => void Linking.openURL(dir.searchUrl)}
                      style={{
                        flex: 1,
                        paddingVertical: 8,
                        borderRadius: 8,
                        backgroundColor: '#F8FAFC',
                        borderWidth: 1,
                        borderColor: colors.line,
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'row',
                        gap: 4,
                      }}
                    >
                      <MaterialIcons name="search" size={14} color={colors.ink} />
                      <Text style={{ fontSize: 11.5, fontWeight: '800', color: colors.ink }}>Check Live</Text>
                    </Pressable>
                  </View>
                </Card>
              );
            })}
          </View>
        </>
      )}
    </Screen>
  );
}

export default withProtectedRoute(CitationsHubScreen);
