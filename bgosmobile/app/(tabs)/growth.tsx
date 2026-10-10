import React, { useState } from 'react';
import { Text, Linking, View, Image, ScrollView, Pressable, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import {
  Screen,
  Card,
  Field,
  Action,
  Empty,
  ErrorNotice,
  Loading,
  ui,
  Avatar,
  Badge,
  Chip,
  MetricCard,
  colors,
} from '../../src/components/ui';
import { useResource } from '../../src/hooks/use-resource';
import type { BgosWorkspace } from '../../../shared/bgos-contracts';
import { useRouter } from 'expo-router';

type Review = {
  id: string;
  rating: number;
  authorName?: string;
  comment?: string;
  source?: string;
  status?: string;
  createdAt?: string;
};

export default function GrowthScreen() {
  const router = useRouter();
  const workspace = useResource<BgosWorkspace>('/api/bgos/workspace');
  const reviews = useResource<{ reviews: Review[] }>('/api/reviews');

  const [activeTab, setActiveTab] = useState<'google' | 'reviews'>('google');
  const [reviewFilter, setReviewFilter] = useState<'all' | 'pending' | 'replied'>('all');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const reviewList = reviews.data?.reviews || [];
  const pendingCount = reviewList.filter((r) => r.status === 'pending').length;
  const repliedCount = reviewList.filter((r) => r.status === 'replied' || r.status === 'published').length;

  const filteredReviews = reviewList.filter((r) => {
    if (reviewFilter === 'all') return true;
    if (reviewFilter === 'pending') return r.status === 'pending';
    if (reviewFilter === 'replied') return r.status === 'replied' || r.status === 'published';
    return true;
  });

  async function requestReview() {
    const reviewLink = workspace.data?.links.review || 'https://search.google.com/local/writereview';
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 8 || digits.length > 15) {
      setError('Enter a valid mobile number with country code.');
      return;
    }
    try {
      await Linking.openURL(
        `https://wa.me/${digits}?text=${encodeURIComponent(
          `Hi ${name.trim() || 'there'}, thank you for choosing ${
            workspace.data?.name || 'our business'
          }! Please take 10 seconds to share your experience: ${reviewLink}`
        )}`
      );
      setError(null);
    } catch {
      setError('Could not open WhatsApp. Check that it is installed.');
    }
  }

  return (
    <Screen
      title="Google & Reputation"
      subtitle="Google Business profile, ratings & customer review requests."
      showBack={true}
      onRefresh={async () => {
        await Promise.all([workspace.refresh(), reviews.refresh()]);
      }}
      rightAction={
        <Action
          label="Share QR"
          icon="qr-code"
          secondary
          onPress={() => router.push('/(tabs)/tools')}
        />
      }
    >
      <ErrorNotice message={error || workspace.error || reviews.error} />

      {/* Tabs: Google Business vs Reviews & Replies */}
      <View style={[ui.row, { justifyContent: 'space-between' }]}>
        <Chip
          label="Google Business Profile"
          selected={activeTab === 'google'}
          onPress={() => setActiveTab('google')}
        />
        <Chip
          label="Customer Reviews"
          count={reviewList.length}
          selected={activeTab === 'reviews'}
          onPress={() => setActiveTab('reviews')}
        />
      </View>

      {/* GOOGLE BUSINESS PROFILE VIEW (Screen 17) */}
      {activeTab === 'google' && (
        <View style={{ gap: 14 }}>
          {/* Business Header Card */}
          <Card style={{ gap: 12 }}>
            <View style={[ui.row, { justifyContent: 'space-between' }]}>
              <View style={[ui.row, { gap: 12, flex: 1 }]}>
                <Image
                  source={{ uri: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=200' }}
                  style={{ width: 60, height: 60, borderRadius: 12 }}
                  accessibilityLabel="Business storefront"
                />
                <View style={{ flex: 1 }}>
                  <Text style={[ui.heading, { fontSize: 17 }]}>
                    {workspace.data?.name || 'Your Business'}
                  </Text>
                  <Text style={ui.caption}>
                    Verified Business Profile
                  </Text>
                  <View style={[ui.row, { gap: 4, marginTop: 4 }]}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#D97706' }}>
                      {reviewList.length ? (reviewList.reduce((acc, r) => acc + (r.rating || 5), 0) / reviewList.length).toFixed(1) : '5.0'} ★
                    </Text>
                    <Text style={ui.caption}>({reviewList.length} verified reviews)</Text>
                  </View>
                </View>
              </View>
              <Badge label="Connected" success />
            </View>
          </Card>

          {/* 4 Stats Grid: Views, Searches, Calls, Directions */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            <MetricCard value="1,248" label="Profile Views" trend="+18%" trendPositive={true} icon="visibility" />
            <MetricCard value="842" label="Search Appearances" trend="+12%" trendPositive={true} icon="search" />
            <MetricCard value="406" label="Phone Calls" trend="+8%" trendPositive={true} icon="phone" />
            <MetricCard value="326" label="Direction Requests" trend="+14%" trendPositive={true} icon="directions" />
          </View>

          {/* 30-Day Trend Chart Simulation Card */}
          <Card style={{ gap: 10 }}>
            <View style={[ui.row, { justifyContent: 'space-between' }]}>
              <Text style={ui.heading}>Profile Views (Last 30 Days)</Text>
              <Badge label="+18% vs Last Month" success />
            </View>

            {/* Sparkline Visual Simulation */}
            <View style={styles.chartContainer}>
              <View style={[styles.chartBar, { height: '40%' }]} />
              <View style={[styles.chartBar, { height: '55%' }]} />
              <View style={[styles.chartBar, { height: '45%' }]} />
              <View style={[styles.chartBar, { height: '70%' }]} />
              <View style={[styles.chartBar, { height: '85%' }]} />
              <View style={[styles.chartBar, { height: '100%', backgroundColor: colors.brand }]} />
            </View>
            <View style={[ui.row, { justifyContent: 'space-between' }]}>
              <Text style={ui.caption}>Week 1</Text>
              <Text style={ui.caption}>Week 2</Text>
              <Text style={ui.caption}>Week 3</Text>
              <Text style={ui.caption}>Week 4</Text>
              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.brand }}>This Week</Text>
            </View>
          </Card>

          <Action
            label="Create Google Business Post"
            icon="post-add"
            onPress={() => router.push('/(tabs)/marketing')}
          />
        </View>
      )}

      {/* REVIEWS & REPLIES VIEW (Screen 18) */}
      {activeTab === 'reviews' && (
        <View style={{ gap: 14 }}>
          {/* Ask for a Review Card */}
          <Card style={{ gap: 10 }}>
            <Text style={ui.heading}>Ask for a Verified Review</Text>
            <Text style={ui.body}>
              Send a personalized review invitation directly to your customer on WhatsApp with 1 tap.
            </Text>
            <Field label="Customer Name" value={name} onChangeText={setName} placeholder="e.g. Priya Singh" />
            <Field
              label="WhatsApp Mobile Number"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="+91 98765 43210"
            />
            <Action
              label="Send Review Request via WhatsApp"
              icon="chat"
              disabled={!phone.trim()}
              onPress={requestReview}
            />
          </Card>

          {/* Review Filter Pills with live counts */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={ui.row}>
              {[
                ['all', `All (${reviewList.length})`],
                ['pending', `Pending (${pendingCount})`],
                ['replied', `Replied (${repliedCount})`],
              ].map(([key, label]) => (
                <Chip
                  key={key}
                  label={label}
                  selected={reviewFilter === key}
                  onPress={() => setReviewFilter(key as any)}
                />
              ))}
            </View>
          </ScrollView>

          {/* Review Items */}
          {reviews.loading ? (
            <Loading />
          ) : filteredReviews.length === 0 ? (
            <Empty
              title={reviewFilter === 'all' ? 'No customer reviews yet' : `No ${reviewFilter} reviews`}
              detail="Send review requests to customers via WhatsApp or share your Google review link."
            />
          ) : (
            filteredReviews.map((r) => (
              <Card key={r.id} style={{ gap: 8 }}>
                <View style={[ui.row, { justifyContent: 'space-between' }]}>
                  <View style={[ui.row, { gap: 10 }]}>
                    <Avatar name={r.authorName || 'Customer'} size={40} />
                    <View>
                      <Text style={ui.heading}>{r.authorName || 'Customer'}</Text>
                      <Text style={ui.caption}>
                        {r.source || 'Google Review'} · {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : 'Recent'}
                      </Text>
                    </View>
                  </View>
                  <Badge
                    label={r.status === 'replied' || r.status === 'published' ? 'Replied' : 'Pending Reply'}
                    success={r.status === 'replied' || r.status === 'published'}
                    accent={r.status === 'pending'}
                  />
                </View>

                <View style={{ flexDirection: 'row', gap: 2 }}>
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <Text key={idx} style={{ fontSize: 16, color: idx < r.rating ? '#F59E0B' : '#D1D5DB' }}>
                      ★
                    </Text>
                  ))}
                </View>

                {r.comment ? <Text style={ui.body}>{r.comment}</Text> : null}

                {r.status === 'pending' && (
                  <Action
                    secondary
                    label="Reply as AI / Owner"
                    icon="reply"
                    onPress={() => Linking.openURL('https://business.google.com').catch(() => {})}
                  />
                )}
              </Card>
            ))
          )}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  chartContainer: {
    height: 100,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingVertical: 8,
    gap: 12,
  },
  chartBar: {
    flex: 1,
    backgroundColor: '#CCFBF1',
    borderRadius: 6,
  },
});
