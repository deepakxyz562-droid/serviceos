/**
 * Provider Detail Screen
 *
 * Fetches GET /api/marketplace/providers/[slug] → full Provider object
 * (services, certifications, portfolio, REAL reviews from our own Review
 * table — NOT Google or stubbed).
 *
 * Sections:
 *   - Hero: cover image, logo/avatar, name, verified badge, city, rating +
 *     review count, website link, call button (Linking).
 *   - About (description)
 *   - Services list: name, price, duration, "Book" button → marketplace/book
 *   - Certifications (if any)
 *   - Portfolio gallery (images grid) — tap to view full
 *   - REAL reviews: average rating at top, then list with author, stars,
 *     date, comment, and provider response (if any)
 *   - Sticky bottom CTA: "Book Service"
 *
 * Loading: <Skeleton> placeholders. Error: <EmptyState> with retry.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Linking,
  FlatList,
  Image as RNImage,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { format } from 'date-fns';
import {
  ArrowLeft,
  MapPin,
  Star,
  Clock,
  Phone,
  Globe,
  AlertCircle,
  BadgeCheck,
  ShieldCheck,
  MessageSquare,
} from 'lucide-react-native';
import { useProvider } from '@/hooks/use-marketplace';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { COLORS } from '@/lib/constants';
import { assetUrl } from '@/lib/api';
import type { Service, Review } from '@/types';

const SCREEN_WIDTH = Dimensions.get('window').width;
const GRID_GAP = 8;
const GRID_COLUMNS = 3;
const GRID_TILE = (SCREEN_WIDTH - 32 - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS;

function formatPrice(price: number | null | undefined): string {
  if (price == null) return '—';
  return `$${price.toFixed(2)}`;
}

function formatDuration(min: number | null | undefined): string {
  if (!min) return '—';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
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

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Text className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
      {children}
    </Text>
  );
}

export default function ProviderDetailScreen() {
  const params = useLocalSearchParams<{ slug: string }>();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;

  const { data: provider, isLoading, isError, error, refetch } = useProvider(slug);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const handleBookService = (service?: Service) => {
    if (!provider) return;
    const query: Record<string, string> = {
      providerId: provider.id,
      slug: provider.slug,
    };
    if (service) query.serviceId = service.id;
    router.push({
      pathname: '/(customer)/marketplace/book',
      params: query,
    });
  };

  const handleCall = () => {
    if (!provider?.phone) return;
    Linking.openURL(`tel:${provider.phone}`).catch(() =>
      Alert.alert('Unable to make a call', 'Your device does not support calling.')
    );
  };

  const handleWebsite = () => {
    if (!provider?.website) return;
    const url = provider.website.startsWith('http')
      ? provider.website
      : `https://${provider.website}`;
    Linking.openURL(url).catch(() => Alert.alert('Unable to open website'));
  };

  // ── Loading ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-background">
        <View className="px-4 py-3">
          <Skeleton className="h-6 w-3/4" />
        </View>
        <View className="px-4">
          <Skeleton className="h-44 w-full rounded-xl" />
          <View className="mt-4">
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="mt-2 h-4 w-3/4" />
          </View>
          <View className="mt-4 gap-2">
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ── Error ────────────────────────────────────────────────────────
  if (isError || !provider) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-background px-4">
        <View className="flex-row items-center py-3">
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <ArrowLeft size={24} color={COLORS.foreground} />
          </Pressable>
        </View>
        <EmptyState
          icon={<AlertCircle size={48} color={COLORS.destructive} />}
          title="Provider not available"
          description={
            error instanceof Error
              ? error.message
              : 'We could not load this provider. Please try again.'
          }
          actionLabel="Retry"
          onAction={() => refetch()}
        />
      </SafeAreaView>
    );
  }

  const rating = provider.rating ?? 0;
  const services = provider.services ?? [];
  const certifications = provider.certifications ?? [];
  const portfolio = provider.portfolio ?? [];
  const reviews = provider.reviews ?? [];
  const coverUrl = assetUrl(provider.coverImageUrl);
  const logoUrl = assetUrl(provider.imageUrl);

  // ── Render ───────────────────────────────────────────────────────
  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      {/* Top bar */}
      <View className="flex-row items-center px-4 py-3">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ArrowLeft size={24} color={COLORS.foreground} />
        </Pressable>
        <Text className="ml-3 flex-1 text-base font-bold text-foreground" numberOfLines={1}>
          {provider.name}
        </Text>
        {provider.verified ? (
          <BadgeCheck size={20} color={COLORS.primary} />
        ) : null}
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View className="px-4">
          <Card padded={false} className="overflow-hidden">
            {coverUrl ? (
              <RNImage
                source={{ uri: coverUrl }}
                style={{ width: '100%', height: 140 }}
                resizeMode="cover"
              />
            ) : (
              <View
                style={{
                  width: '100%',
                  height: 140,
                  backgroundColor: COLORS.primaryLight,
                }}
              />
            )}
            <View className="p-4">
              <View className="flex-row items-end">
                {/* Logo / avatar */}
                <View
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 32,
                    backgroundColor: COLORS.primary,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: -40,
                    borderWidth: 3,
                    borderColor: '#fff',
                    overflow: 'hidden',
                  }}
                >
                  {logoUrl ? (
                    <RNImage
                      source={{ uri: logoUrl }}
                      style={{ width: 64, height: 64, borderRadius: 32 }}
                      resizeMode="cover"
                    />
                  ) : (
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 24 }}>
                      {provider.name.slice(0, 1).toUpperCase()}
                    </Text>
                  )}
                </View>
                <View className="ml-3 flex-1">
                  <View className="flex-row items-center flex-wrap">
                    <Text className="text-lg font-bold text-foreground" numberOfLines={1}>
                      {provider.name}
                    </Text>
                    {provider.verified ? (
                      <View className="ml-2 flex-row items-center rounded-full bg-green-100 px-2 py-0.5">
                        <BadgeCheck size={11} color="#166534" />
                        <Text className="ml-1 text-xs font-semibold text-green-700">
                          Verified
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  {provider.city ? (
                    <View className="mt-1 flex-row items-center">
                      <MapPin size={12} color={COLORS.mutedForeground} />
                      <Text className="ml-1 text-sm text-muted-foreground">{provider.city}</Text>
                    </View>
                  ) : null}
                </View>
              </View>

              {/* Rating + review count */}
              <View className="mt-3 flex-row items-center">
                <Stars rating={rating} size={14} />
                <Text className="ml-1.5 text-sm font-semibold text-foreground">
                  {rating.toFixed(1)}
                </Text>
                <Text className="ml-1 text-sm text-muted-foreground">
                  ({provider.reviewCount} review{provider.reviewCount === 1 ? '' : 's'})
                </Text>
              </View>

              {/* Quick action row */}
              <View className="mt-3 flex-row">
                {provider.phone ? (
                  <Pressable
                    onPress={handleCall}
                    className="mr-2 flex-row items-center rounded-lg bg-primary-50 px-3 py-2"
                  >
                    <Phone size={14} color={COLORS.primary} />
                    <Text className="ml-1.5 text-xs font-semibold text-primary-700">Call</Text>
                  </Pressable>
                ) : null}
                {provider.website ? (
                  <Pressable
                    onPress={handleWebsite}
                    className="flex-row items-center rounded-lg bg-primary-50 px-3 py-2"
                  >
                    <Globe size={14} color={COLORS.primary} />
                    <Text className="ml-1.5 text-xs font-semibold text-primary-700">Website</Text>
                  </Pressable>
                ) : null}
              </View>

              {/* Category chips */}
              {provider.serviceCategories && provider.serviceCategories.length > 0 ? (
                <View className="mt-3 flex-row flex-wrap">
                  {provider.serviceCategories.map((c) => (
                    <View key={c} className="mr-2 mb-1">
                      <Badge variant="primary">{c}</Badge>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          </Card>
        </View>

        {/* Description */}
        {provider.description ? (
          <View className="mt-4 px-4">
            <SectionTitle>About</SectionTitle>
            <Card>
              <Text className="text-sm leading-5 text-foreground">{provider.description}</Text>
            </Card>
          </View>
        ) : null}

        {/* Services */}
        {services.length > 0 ? (
          <View className="mt-4 px-4">
            <SectionTitle>Services ({services.length})</SectionTitle>
            {services.map((s) => (
              <Card key={s.id} className="mb-2">
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 pr-3">
                    <Text className="text-base font-semibold text-foreground">{s.name}</Text>
                    {s.description ? (
                      <Text className="mt-1 text-sm text-muted-foreground" numberOfLines={2}>
                        {s.description}
                      </Text>
                    ) : null}
                    <View className="mt-2 flex-row items-center">
                      <Text className="text-base font-bold text-primary-700">
                        {formatPrice(s.price)}
                      </Text>
                      {s.durationMinutes ? (
                        <View className="ml-3 flex-row items-center">
                          <Clock size={12} color={COLORS.mutedForeground} />
                          <Text className="ml-1 text-xs text-muted-foreground">
                            {formatDuration(s.durationMinutes)}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                  <Button size="sm" onPress={() => handleBookService(s)}>
                    Book
                  </Button>
                </View>
              </Card>
            ))}
          </View>
        ) : null}

        {/* Certifications */}
        {certifications.length > 0 ? (
          <View className="mt-4 px-4">
            <SectionTitle>Certifications &amp; Licences</SectionTitle>
            {certifications.map((cert) => (
              <Card key={cert.id} className="mb-2">
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 pr-2">
                    <Text className="text-sm font-semibold text-foreground">{cert.name}</Text>
                    {cert.issuer ? (
                      <Text className="mt-0.5 text-xs text-muted-foreground">
                        Issued by {cert.issuer}
                      </Text>
                    ) : null}
                    {cert.issueDate ? (
                      <Text className="mt-0.5 text-xs text-muted-foreground">
                        Issued {format(new Date(cert.issueDate), 'MMM yyyy')}
                      </Text>
                    ) : null}
                  </View>
                  {cert.verified ? (
                    <View className="flex-row items-center rounded-full bg-green-100 px-2 py-0.5">
                      <ShieldCheck size={11} color="#166534" />
                      <Text className="ml-1 text-xs font-semibold text-green-700">Verified</Text>
                    </View>
                  ) : null}
                </View>
              </Card>
            ))}
          </View>
        ) : null}

        {/* Portfolio gallery */}
        {portfolio.length > 0 ? (
          <View className="mt-4 px-4">
            <SectionTitle>Portfolio</SectionTitle>
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                marginHorizontal: -GRID_GAP / 2,
              }}
            >
              {portfolio.slice(0, 9).map((item) => {
                const url = assetUrl(item.imageUrl);
                if (!url) return null;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => setLightboxUrl(url)}
                    style={{
                      width: GRID_TILE,
                      height: GRID_TILE,
                      margin: GRID_GAP / 2,
                      borderRadius: 8,
                      overflow: 'hidden',
                    }}
                  >
                    <RNImage
                      source={{ uri: url }}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode="cover"
                    />
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* Reviews (REAL — from the Provider.reviews[] array, not stubbed) */}
        <View className="mt-4 px-4">
          <SectionTitle>Customer Reviews</SectionTitle>
          <Card>
            <View className="flex-row items-center">
              <Star size={24} color={COLORS.accent} fill={COLORS.accent} />
              <Text className="ml-2 text-2xl font-bold text-foreground">
                {rating.toFixed(1)}
              </Text>
              <Text className="ml-2 text-sm text-muted-foreground">
                out of 5 · {provider.reviewCount} review
                {provider.reviewCount === 1 ? '' : 's'}
              </Text>
            </View>
          </Card>

          {reviews.length === 0 ? (
            <Card className="mt-2">
              <View className="items-center py-4">
                <MessageSquare size={32} color={COLORS.mutedForeground} />
                <Text className="mt-2 text-sm text-muted-foreground">No reviews yet</Text>
              </View>
            </Card>
          ) : (
            <View className="mt-2">
              {reviews.map((review: Review) => (
                <Card key={review.id} className="mb-2">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm font-semibold text-foreground">
                      {review.authorName || 'Anonymous'}
                    </Text>
                    <Text className="text-xs text-muted-foreground">
                      {review.createdAt
                        ? format(new Date(review.createdAt), 'MMM d, yyyy')
                        : ''}
                    </Text>
                  </View>
                  <View className="mt-1">
                    <Stars rating={review.rating} size={12} />
                  </View>
                  {review.comment ? (
                    <Text className="mt-2 text-sm leading-5 text-foreground">
                      {review.comment}
                    </Text>
                  ) : null}
                  {review.response ? (
                    <View
                      className="mt-3 rounded-lg border border-border bg-muted p-3"
                    >
                      <Text className="text-xs font-semibold text-muted-foreground">
                        Response from {provider.name}
                      </Text>
                      <Text className="mt-1 text-sm text-foreground">{review.response}</Text>
                      {review.respondedAt ? (
                        <Text className="mt-1 text-xs text-muted-foreground">
                          {format(new Date(review.respondedAt), 'MMM d, yyyy')}
                        </Text>
                      ) : null}
                    </View>
                  ) : null}
                </Card>
              ))}
            </View>
          )}
        </View>

        <View className="h-8" />
      </ScrollView>

      {/* Sticky bottom CTA */}
      <View className="absolute bottom-0 left-0 right-0 border-t border-border bg-white px-4 pb-6 pt-3">
        <Button size="lg" fullWidth onPress={() => handleBookService()}>
          Book Service
        </Button>
      </View>

      {/* Lightbox */}
      <Modal
        visible={!!lightboxUrl}
        onClose={() => setLightboxUrl(null)}
        position="center"
        showHandle={false}
      >
        {lightboxUrl ? (
          <View style={{ padding: 0 }}>
            <RNImage
              source={{ uri: lightboxUrl }}
              style={{
                width: SCREEN_WIDTH - 48,
                height: SCREEN_WIDTH - 48,
                borderRadius: 8,
              }}
              resizeMode="contain"
            />
            <Pressable
              onPress={() => setLightboxUrl(null)}
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                backgroundColor: 'rgba(0,0,0,0.5)',
                borderRadius: 14,
                width: 28,
                height: 28,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: '#fff', fontSize: 16, lineHeight: 18 }}>×</Text>
            </Pressable>
          </View>
        ) : null}
      </Modal>
    </SafeAreaView>
  );
}
