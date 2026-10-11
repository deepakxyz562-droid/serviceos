/**
 * Marketplace Browse Screen
 *
 * Replaces the previous version which had three CRITICAL bugs reported by the
 * user (city auto-detect missing, hardcoded categories, no loader during
 * filtering). Now:
 *   - City auto-detects on mount via detectCity() (GPS → IP fallback → cache).
 *   - Categories come from GET /api/marketplace/counts (NOT hardcoded).
 *   - A SkeletonList renders whenever the query is refetching due to a filter
 *     change OR while the 500ms search debounce is pending.
 *
 * Features:
 *   - Search input (500ms debounce → q param)
 *   - City filter via bottom-sheet picker (cities from API, auto-detected
 *     pre-selected)
 *   - Sort via bottom-sheet picker (MARKETPLACE_SORT_OPTIONS, default recommended)
 *   - Category chips (horizontal scroll, fetched from API)
 *   - "Detect my location" button with loading spinner
 *   - FlatList with infinite cursor pagination + pull-to-refresh
 *   - Provider cards: image, name, city, rating stars, reviewCount, verified
 *     badge, featured badge, distance (if available), category chips
 *   - "X providers found" total count
 *   - Empty state with "Clear filters" action
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Image as RNImage,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  Search,
  MapPin,
  Star,
  SlidersHorizontal,
  X,
  Navigation,
  BadgeCheck,
  Sparkles,
  ChevronDown,
  Check,
  ShoppingBag,
  AlertCircle,
} from 'lucide-react-native';
import {
  useMarketplaceProviders,
  useMarketplaceCities,
  useMarketplaceCategories,
} from '@/hooks/use-marketplace';
import { detectCity } from '@/lib/location';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { SkeletonList } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { COLORS, MARKETPLACE_SORT_OPTIONS } from '@/lib/constants';
import { assetUrl } from '@/lib/api';
import { cn } from '@/lib/cn';
import type { Provider, MarketplaceCity } from '@/types';

const PAGE_SIZE = 24;

function Stars({ rating, size = 12 }: { rating: number; size?: number }) {
  const rounded = Math.round(rating);
  return (
    <View className="flex-row">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          color={COLORS.accent}
          fill={i <= rounded ? COLORS.accent : 'transparent'}
        />
      ))}
    </View>
  );
}

function ProviderAvatar({ provider, size = 56 }: { provider: Provider; size?: number }) {
  const uri = assetUrl(provider.imageUrl);
  const initials = provider.name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
  if (uri) {
    return (
      <RNImage
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        resizeMode="cover"
      />
    );
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: '#fff', fontWeight: '700', fontSize: size * 0.36 }}>
        {initials || '?'}
      </Text>
    </View>
  );
}

export default function MarketplaceBrowseScreen() {
  const { show } = useToast();

  // ── Filter state ──────────────────────────────────────────────────
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [city, setCity] = useState<string | undefined>(undefined);
  const [category, setCategory] = useState<string | undefined>(undefined); // slug
  const [sort, setSort] = useState<string>('recommended');

  const [cityPickerOpen, setCityPickerOpen] = useState(false);
  const [sortPickerOpen, setSortPickerOpen] = useState(false);

  const [detecting, setDetecting] = useState(false);
  const [detectedCity, setDetectedCity] = useState<string | null>(null);

  // ── Auto-detect city on mount (cache → GPS → IP) ──────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await detectCity();
        if (cancelled) return;
        if (result?.city) {
          setDetectedCity(result.city);
          setCity(result.city);
        }
      } catch {
        // silent — user can pick manually
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDetectLocation = async () => {
    setDetecting(true);
    try {
      const result = await detectCity({ skipCache: true });
      if (result?.city) {
        setDetectedCity(result.city);
        setCity(result.city);
        show(`Detected: ${result.city}`, 'success');
      } else {
        show('Could not detect your location. Pick a city manually.', 'info');
      }
    } catch {
      show('Location detection failed. Pick a city manually.', 'error');
    } finally {
      setDetecting(false);
    }
  };

  // ── Debounced search (500ms) ──────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 500);
    return () => clearTimeout(t);
  }, [searchInput]);

  const isDebouncing = searchInput.trim() !== search;

  // ── Queries ───────────────────────────────────────────────────────
  const filters = useMemo(
    () => ({
      q: search || undefined,
      city,
      category,
      sort,
      limit: PAGE_SIZE,
    }),
    [search, city, category, sort]
  );

  const {
    data,
    isLoading,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    isRefetching,
    error,
  } = useMarketplaceProviders(filters);

  const { data: cities } = useMarketplaceCities();
  const { data: counts } = useMarketplaceCategories();

  const providers = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap((p) => p.items);
  }, [data]);

  const totalCount = useMemo(() => {
    const first = data?.pages?.[0];
    if (first?.total != null) return first.total;
    return providers.length;
  }, [data, providers.length]);

  // True when the active filter set is being applied (refetch without a
  // prior page of data, or while the search debounce is mid-flight).
  const isFiltering =
    isLoading || isDebouncing || (isFetching && !isFetchingNextPage && !isRefetching);

  // ── Handlers ──────────────────────────────────────────────────────
  const handleProviderPress = (provider: Provider) => {
    router.push({
      pathname: '/(customer)/marketplace/[slug]',
      params: { slug: provider.slug },
    });
  };

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage && !isFiltering) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, isFiltering, fetchNextPage]);

  const clearAllFilters = () => {
    setCity(undefined);
    setSearchInput('');
    setSearch('');
    setCategory(undefined);
    setSort('recommended');
  };

  const hasActiveFilters = !!city || !!search || !!category || sort !== 'recommended';

  // ── Renderers ─────────────────────────────────────────────────────
  const renderProvider = ({ item }: { item: Provider }) => {
    const rating = item.rating ?? 0;
    return (
      <Pressable
        onPress={() => handleProviderPress(item)}
        accessibilityRole="button"
        accessibilityLabel={`View ${item.name}`}
        className="active:opacity-70"
      >
        <Card className="mb-3">
          <View className="flex-row items-start">
            <ProviderAvatar provider={item} />
            <View className="ml-3 flex-1 pr-2">
              <View className="flex-row items-center flex-wrap">
                <Text className="text-base font-bold text-foreground flex-shrink" numberOfLines={1}>
                  {item.name}
                </Text>
                {item.verified ? (
                  <BadgeCheck size={16} color={COLORS.primary} />
                ) : null}
                {item.featured ? (
                  <View className="ml-1 flex-row items-center rounded-full bg-amber-100 px-2 py-0.5">
                    <Sparkles size={10} color="#92400E" />
                    <Text className="ml-1 text-xs font-semibold text-amber-700">Featured</Text>
                  </View>
                ) : null}
              </View>
              {item.city ? (
                <View className="mt-1 flex-row items-center">
                  <MapPin size={12} color={COLORS.mutedForeground} />
                  <Text className="ml-1 text-xs text-muted-foreground">{item.city}</Text>
                  {item.distanceKm != null ? (
                    <Text className="ml-2 text-xs text-muted-foreground">
                      · {item.distanceKm.toFixed(1)} km
                    </Text>
                  ) : null}
                </View>
              ) : null}
              <View className="mt-1 flex-row items-center">
                <Star size={12} color={COLORS.accent} fill={COLORS.accent} />
                <Text className="ml-1 text-xs font-semibold text-foreground">
                  {rating.toFixed(1)}
                </Text>
                <Text className="ml-1 text-xs text-muted-foreground">
                  ({item.reviewCount})
                </Text>
              </View>
            </View>
          </View>

          {item.description ? (
            <Text className="mt-2 text-sm text-muted-foreground" numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}

          {item.serviceCategories && item.serviceCategories.length > 0 ? (
            <View className="mt-3 flex-row flex-wrap">
              {item.serviceCategories.slice(0, 4).map((c) => (
                <View key={c} className="mr-2 mb-1">
                  <Badge variant="default">{c}</Badge>
                </View>
              ))}
            </View>
          ) : null}
        </Card>
      </Pressable>
    );
  };

  const renderListFooter = () => {
    if (isFetchingNextPage) {
      return (
        <View className="py-4">
          <ActivityIndicator color={COLORS.primary} />
        </View>
      );
    }
    if (hasNextPage) {
      return (
        <View className="py-4">
          <Button variant="outline" onPress={() => fetchNextPage()} fullWidth>
            Load More
          </Button>
        </View>
      );
    }
    if (providers.length > 0 && !isFiltering) {
      return (
        <Text className="py-4 text-center text-xs text-muted-foreground">
          You&apos;ve reached the end
        </Text>
      );
    }
    return null;
  };

  const renderHeader = () => (
    <View className="mb-2">
      {/* Search bar */}
      <View className="flex-row items-center rounded-xl border border-border bg-white px-3 py-2">
        <Search size={18} color={COLORS.mutedForeground} />
        <TextInput
          value={searchInput}
          onChangeText={setSearchInput}
          placeholder="Search providers, services…"
          placeholderTextColor="#9CA3AF"
          className="ml-2 flex-1 text-base text-foreground"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {searchInput.length > 0 ? (
          <Pressable onPress={() => setSearchInput('')} hitSlop={8}>
            <X size={18} color={COLORS.mutedForeground} />
          </Pressable>
        ) : null}
      </View>

      {/* City chip + Detect my location */}
      <View className="mt-2 flex-row items-center gap-2">
        <Pressable
          onPress={() => setCityPickerOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Filter by city"
          className="flex-1 flex-row items-center justify-between rounded-xl border border-border bg-white px-3 py-2"
        >
          <View className="flex-row items-center flex-1">
            <MapPin size={16} color={COLORS.primary} />
            <Text
              className="ml-2 flex-1 text-sm font-medium text-foreground"
              numberOfLines={1}
            >
              {city ? city : detectedCity ? `${detectedCity} (detected)` : 'All cities'}
            </Text>
          </View>
          {city ? (
            <Pressable
              hitSlop={8}
              onPress={(e) => {
                e.stopPropagation();
                setCity(undefined);
              }}
            >
              <X size={16} color={COLORS.mutedForeground} />
            </Pressable>
          ) : (
            <ChevronDown size={16} color={COLORS.mutedForeground} />
          )}
        </Pressable>
        <Pressable
          onPress={handleDetectLocation}
          disabled={detecting}
          accessibilityRole="button"
          accessibilityLabel="Detect my location"
          className="flex-row items-center rounded-xl border border-primary-500 bg-primary-50 px-3 py-2"
        >
          {detecting ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <Navigation size={14} color={COLORS.primary} />
          )}
          <Text className="ml-1.5 text-xs font-semibold text-primary-700">
            {detecting ? 'Locating…' : 'Near me'}
          </Text>
        </Pressable>
      </View>

      {/* Sort row + total count */}
      <View className="mt-2 flex-row items-center justify-between">
        <Pressable
          onPress={() => setSortPickerOpen(true)}
          className="flex-row items-center rounded-lg bg-muted px-3 py-1.5"
        >
          <SlidersHorizontal size={14} color={COLORS.foreground} />
          <Text className="ml-1.5 text-xs font-semibold text-foreground">
            {MARKETPLACE_SORT_OPTIONS.find((o) => o.value === sort)?.label ?? 'Sort'}
          </Text>
          <ChevronDown size={14} color={COLORS.mutedForeground} />
        </Pressable>
        <Text className="text-xs text-muted-foreground">
          {isFiltering
            ? 'Searching…'
            : `${totalCount} provider${totalCount === 1 ? '' : 's'} found`}
        </Text>
      </View>

      {/* Category chips — fetched from API */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={[
          { slug: undefined as string | undefined, name: 'All', count: counts?.total },
          ...(counts?.categories ?? []),
        ]}
        keyExtractor={(c, i) => c.slug ?? `all-${i}`}
        contentContainerStyle={{ paddingVertical: 10 }}
        renderItem={({ item: cat }) => {
          const selected = category === cat.slug || (!category && !cat.slug);
          return (
            <Pressable
              onPress={() => setCategory(cat.slug)}
              className={cn(
                'mr-2 rounded-full border px-3 py-1.5',
                selected ? 'border-primary-500 bg-primary-500' : 'border-border bg-white'
              )}
            >
              <View className="flex-row items-center">
                <Text
                  className={cn(
                    'text-xs font-semibold',
                    selected ? 'text-white' : 'text-muted-foreground'
                  )}
                >
                  {cat.name}
                </Text>
                {typeof cat.count === 'number' && cat.count > 0 ? (
                  <Text
                    className={cn(
                      'ml-1.5 text-xs',
                      selected ? 'text-white/80' : 'text-muted-foreground/70'
                    )}
                  >
                    {cat.count}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          );
        }}
      />

      {/* Skeleton / filtering placeholder */}
      {isFiltering ? <SkeletonList count={3} /> : null}
    </View>
  );

  // ── Initial-load state ────────────────────────────────────────────
  if (isLoading && providers.length === 0) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-background px-4">
        <View className="px-0 py-2">
          <Text className="text-xl font-bold text-foreground">Marketplace</Text>
        </View>
        <SkeletonList count={5} />
      </SafeAreaView>
    );
  }

  // ── Error state (only when no data) ───────────────────────────────
  if (error && providers.length === 0 && !isFiltering) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-background px-4">
        <EmptyState
          icon={<AlertCircle size={48} color={COLORS.destructive} />}
          title="Couldn&apos;t load providers"
          description={
            error instanceof Error ? error.message : 'Something went wrong.'
          }
          actionLabel="Retry"
          onAction={() => refetch()}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <FlatList
        data={isFiltering ? [] : providers}
        keyExtractor={(item) => item.id}
        renderItem={renderProvider}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderListFooter}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.4}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={
          isFiltering ? null : (
            <EmptyState
              icon={<ShoppingBag size={48} color={COLORS.mutedForeground} />}
              title="No providers found"
              description={
                hasActiveFilters
                  ? 'Try adjusting your search or filters to find a service provider.'
                  : 'No providers are available right now. Check back soon.'
              }
              actionLabel={hasActiveFilters ? 'Clear filters' : undefined}
              onAction={hasActiveFilters ? clearAllFilters : undefined}
            />
          )
        }
      />

      {/* City picker bottom sheet */}
      <Modal
        visible={cityPickerOpen}
        onClose={() => setCityPickerOpen(false)}
        position="bottom"
      >
        <View className="px-4 pb-2">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-lg font-bold text-foreground">Select city</Text>
            <Pressable onPress={() => setCityPickerOpen(false)} hitSlop={8}>
              <X size={20} color={COLORS.mutedForeground} />
            </Pressable>
          </View>
        </View>
        <FlatList
          data={[
            { name: '__all__', providerCount: counts?.total ?? 0 } as MarketplaceCity,
            ...(cities ?? []),
          ]}
          keyExtractor={(c, i) => c.id ?? c.name ?? `city-${i}`}
          renderItem={({ item }) => {
            const isAll = item.name === '__all__';
            const label = isAll ? 'All cities' : item.name;
            const selected = isAll ? !city : city === item.name;
            return (
              <Pressable
                onPress={() => {
                  setCity(isAll ? undefined : item.name);
                  setCityPickerOpen(false);
                }}
                className={cn(
                  'mx-4 mb-2 flex-row items-center justify-between rounded-xl border px-3 py-3',
                  selected ? 'border-primary-500 bg-primary-50' : 'border-border'
                )}
              >
                <View className="flex-row items-center flex-1">
                  {detectedCity && item.name === detectedCity ? (
                    <Navigation size={14} color={COLORS.primary} />
                  ) : null}
                  <Text
                    className={cn(
                      'text-base font-medium',
                      detectedCity && item.name === detectedCity
                        ? 'ml-1.5 text-primary-700'
                        : 'text-foreground'
                    )}
                  >
                    {label}
                  </Text>
                </View>
                <View className="flex-row items-center">
                  {typeof item.providerCount === 'number' ? (
                    <Text className="mr-2 text-xs text-muted-foreground">
                      {item.providerCount} provider{item.providerCount === 1 ? '' : 's'}
                    </Text>
                  ) : null}
                  {selected ? <Check size={16} color={COLORS.primary} /> : null}
                </View>
              </Pressable>
            );
          }}
          style={{ maxHeight: 460 }}
          contentContainerStyle={{ paddingBottom: 12 }}
        />
      </Modal>

      {/* Sort picker bottom sheet */}
      <Modal
        visible={sortPickerOpen}
        onClose={() => setSortPickerOpen(false)}
        position="bottom"
      >
        <View className="px-4 pb-2">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-lg font-bold text-foreground">Sort by</Text>
            <Pressable onPress={() => setSortPickerOpen(false)} hitSlop={8}>
              <X size={20} color={COLORS.mutedForeground} />
            </Pressable>
          </View>
        </View>
        {MARKETPLACE_SORT_OPTIONS.map((opt) => {
          const selected = sort === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => {
                setSort(opt.value);
                setSortPickerOpen(false);
              }}
              className={cn(
                'mx-4 mb-2 flex-row items-center justify-between rounded-xl border px-3 py-3',
                selected ? 'border-primary-500 bg-primary-50' : 'border-border'
              )}
            >
              <Text
                className={cn(
                  'text-base font-medium',
                  selected ? 'text-primary-700' : 'text-foreground'
                )}
              >
                {opt.label}
              </Text>
              {selected ? <Check size={16} color={COLORS.primary} /> : null}
            </Pressable>
          );
        })}
      </Modal>
    </SafeAreaView>
  );
}
