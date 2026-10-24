import React, { useState } from 'react';
import { Text, Linking, View, ScrollView } from 'react-native';
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
  colors,
} from '../../src/components/ui';
import { useResource } from '../../src/hooks/use-resource';
import type { BgosWorkspace } from '../../../shared/bgos-contracts';
import { WEB_URL } from '../../src/lib/constants';
import { getBgosWebUrl } from '../../src/lib/bgos-urls';
import { useRouter } from 'expo-router';

type Review = {
  id: string;
  rating: number;
  authorName?: string;
  comment?: string;
  source?: string;
  status?: string;
  responseJson?: string;
  createdAt?: string;
};

function hasReply(review: Review): boolean {
  try { return Boolean(JSON.parse(review.responseJson || '{}')?.text?.trim()); }
  catch { return false; }
}

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
  const pendingCount = reviewList.filter((r) => !hasReply(r)).length;
  const repliedCount = reviewList.filter((r) => hasReply(r)).length;

  const filteredReviews = reviewList.filter((r) => {
    if (reviewFilter === 'all') return true;
    if (reviewFilter === 'pending') return !hasReply(r);
    if (reviewFilter === 'replied') return hasReply(r);
    return true;
  });

  async function requestReview() {
    const reviewLink = workspace.data?.links.review;
    if (!reviewLink || !/^https:\/\//i.test(reviewLink)) {
      setError('Configure your business review link in BGOS web before sending an invitation.');
      return;
    }
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
                <Avatar name={workspace.data?.name || 'Business'} size={60} />
                <View style={{ flex: 1 }}>
                  <Text style={[ui.heading, { fontSize: 17 }]}>
                    {workspace.data?.name || 'Your Business'}
                  </Text>
                  <Text style={ui.caption}>
                    Business reviews
                  </Text>
                  <View style={[ui.row, { gap: 4, marginTop: 4 }]}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#D97706' }}>
                      {reviewList.length ? (reviewList.reduce((acc, r) => acc + (r.rating || 0), 0) / reviewList.length).toFixed(1) : '—'} ★
                    </Text>
                    <Text style={ui.caption}>({reviewList.length} loaded reviews)</Text>
                  </View>
                </View>
              </View>
            </View>
          </Card>

          <Card>
            <Text style={ui.heading}>Google Business performance</Text>
            <Text style={ui.body}>View account connection status and available Google metrics on BGOS web.</Text>
            <Action secondary label="Open Google Business · Web" onPress={() => Linking.openURL(getBgosWebUrl('reviews')).catch(() => setError('Could not open the browser.'))} />
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
            <Text style={ui.heading}>Request a Customer Review</Text>
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
              label="Open Review Request in WhatsApp"
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
                    label={hasReply(r) ? 'Replied' : 'Pending Reply'}
                    success={hasReply(r)}
                    accent={!hasReply(r)}
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

                {!hasReply(r) && (
                  <Action
                    secondary
                    label="Reply in Google Business"
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
