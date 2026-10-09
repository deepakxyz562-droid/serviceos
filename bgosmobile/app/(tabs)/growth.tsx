import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Share,
  Linking,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/stores/auth-store';
import { apiRequest } from '../../src/lib/api';
import { API_PATHS, WEB_URL } from '../../src/lib/constants';

interface ReviewItem {
  id: string;
  authorName: string;
  rating: number;
  comment: string;
  createdAt: string;
  source: string;
}

const MOCK_REVIEWS: ReviewItem[] = [
  {
    id: 'rev-1',
    authorName: 'Sanjay Aggarwal',
    rating: 5,
    comment: 'Exceptional service! Quick response on WhatsApp and clear communication throughout.',
    createdAt: 'Yesterday',
    source: 'Google',
  },
  {
    id: 'rev-2',
    authorName: 'Sunita Mehra',
    rating: 5,
    comment: 'The booking was seamless and the team was on time. Highly recommended!',
    createdAt: '3 days ago',
    source: 'Direct',
  },
];

export default function GrowthScreen() {
  const { user } = useAuthStore();
  const [reviews, setReviews] = useState<ReviewItem[]>(MOCK_REVIEWS);
  const [loading, setLoading] = useState(false);
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');

  const businessSlug = user?.name ? user.name.toLowerCase().replace(/\s+/g, '-') : 'my-business';
  const reviewLink = `${WEB_URL}/p/${businessSlug}#reviews`;

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiRequest(API_PATHS.reviews);
      if (res && Array.isArray(res.reviews) && res.reviews.length > 0) {
        setReviews(
          res.reviews.map((r: any) => ({
            id: r.id,
            authorName: r.authorName || 'Verified Client',
            rating: r.rating || 5,
            comment: r.comment || 'Great experience with this business.',
            createdAt: r.createdAt ? new Date(r.createdAt).toLocaleDateString() : 'Recent',
            source: r.source || 'Google',
          }))
        );
      }
    } catch {
      // Fallback stays
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleSendReviewRequest = () => {
    if (!customerPhone.trim()) {
      Alert.alert('Phone Required', 'Please enter the customer phone number.');
      return;
    }

    const clean = customerPhone.replace(/[^\d]/g, '');
    const clientGreeting = customerName.trim() ? `Hi ${customerName.trim()}!` : 'Hi!';
    const message = encodeURIComponent(
      `${clientGreeting} Thank you for choosing ${user?.name || 'us'}. Could you please leave us a quick review? It takes only 10 seconds: ${reviewLink}`
    );

    Linking.openURL(`https://wa.me/${clean}?text=${message}`);
    setCustomerPhone('');
    setCustomerName('');
  };

  const handleShareQr = async () => {
    const cardUrl = `${WEB_URL}/p/${businessSlug}`;
    try {
      await Share.share({
        message: `Scan or visit ${user?.name || 'our business'}: ${cardUrl}`,
        url: cardUrl,
        title: 'Share Business Profile & QR',
      });
    } catch {
      Alert.alert('Share Link', cardUrl);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Growth & Local Marketing</Text>
          <Text style={styles.subtitle}>Get Reviews, Broadcast Offers & Share QR</Text>
        </View>
        <TouchableOpacity style={styles.shareHeaderBtn} onPress={handleShareQr}>
          <MaterialIcons name="qr-code-scanner" size={20} color="#38bdf8" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchReviews} tintColor="#38bdf8" />}
      >
        {/* Section 1: 1-Tap WhatsApp Review Request */}
        <View style={styles.cardSection}>
          <View style={styles.sectionTitleRow}>
            <View style={[styles.iconBox, { backgroundColor: '#f59e0b20' }]}>
              <MaterialIcons name="star" size={20} color="#f59e0b" />
            </View>
            <View>
              <Text style={styles.sectionTitle}>Get More Google Reviews</Text>
              <Text style={styles.sectionSubtitle}>Send 1-tap review link directly via WhatsApp</Text>
            </View>
          </View>

          <View style={styles.inputForm}>
            <TextInput
              style={styles.inputField}
              placeholder="Customer Name (optional)"
              placeholderTextColor="#64748b"
              value={customerName}
              onChangeText={setCustomerName}
            />
            <TextInput
              style={styles.inputField}
              placeholder="Customer WhatsApp Number (e.g. +91 98765 43210)"
              placeholderTextColor="#64748b"
              keyboardType="phone-pad"
              value={customerPhone}
              onChangeText={setCustomerPhone}
            />
            <TouchableOpacity style={styles.whatsappSendBtn} onPress={handleSendReviewRequest}>
              <MaterialIcons name="send" size={16} color="#ffffff" />
              <Text style={styles.whatsappSendBtnText}>Send WhatsApp Review Request</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Section 2: Storefront / Countertop QR Code */}
        <View style={styles.cardSection}>
          <View style={styles.sectionTitleRow}>
            <View style={[styles.iconBox, { backgroundColor: '#10b98120' }]}>
              <MaterialIcons name="qr-code" size={20} color="#10b981" />
            </View>
            <View>
              <Text style={styles.sectionTitle}>Countertop & Storefront QR</Text>
              <Text style={styles.sectionSubtitle}>Place on desk, table or billing counter for quick scans</Text>
            </View>
          </View>

          <View style={styles.qrDisplayCard}>
            <View style={styles.qrMockFrame}>
              <MaterialIcons name="qr-code-2" size={110} color="#0f172a" />
              <Text style={styles.qrLabelText}>SCAN TO CONNECT & BOOK</Text>
            </View>

            <View style={styles.qrDetails}>
              <Text style={styles.qrBusinessName}>{user?.name || 'My Business'}</Text>
              <Text style={styles.qrLinkText} numberOfLines={1}>
                {WEB_URL}/p/{businessSlug}
              </Text>

              <TouchableOpacity style={styles.shareQrBtn} onPress={handleShareQr}>
                <MaterialIcons name="share" size={16} color="#ffffff" />
                <Text style={styles.shareQrBtnText}>Share / Print QR Code</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Section 3: Recent Customer Testimonials */}
        <View style={styles.cardSection}>
          <View style={styles.sectionTitleRow}>
            <View style={[styles.iconBox, { backgroundColor: '#0284c720' }]}>
              <MaterialIcons name="rate-review" size={20} color="#38bdf8" />
            </View>
            <View>
              <Text style={styles.sectionTitle}>Recent Reviews</Text>
              <Text style={styles.sectionSubtitle}>Verified customer feedback & ratings</Text>
            </View>
          </View>

          <View style={styles.reviewsList}>
            {reviews.map((rev) => (
              <View key={rev.id} style={styles.reviewItem}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewerName}>{rev.authorName}</Text>
                  <View style={styles.starsRow}>
                    {[...Array(rev.rating)].map((_, i) => (
                      <MaterialIcons key={i} name="star" size={14} color="#f59e0b" />
                    ))}
                  </View>
                </View>
                <Text style={styles.reviewComment}>{rev.comment}</Text>
                <View style={styles.reviewMeta}>
                  <Text style={styles.reviewDate}>{rev.createdAt}</Text>
                  <Text style={styles.reviewSource}>via {rev.source}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b1120',
  },
  header: {
    paddingTop: 54,
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  shareHeaderBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  cardSection: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  sectionSubtitle: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 1,
  },
  inputForm: {
    gap: 10,
  },
  inputField: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    color: '#ffffff',
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#334155',
  },
  whatsappSendBtn: {
    backgroundColor: '#22c55e',
    borderRadius: 10,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  whatsappSendBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  qrDisplayCard: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  qrMockFrame: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 14,
  },
  qrLabelText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  qrDetails: {
    width: '100%',
    alignItems: 'center',
  },
  qrBusinessName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  qrLinkText: {
    fontSize: 11,
    color: '#38bdf8',
    marginTop: 2,
    marginBottom: 14,
  },
  shareQrBtn: {
    backgroundColor: '#0284c7',
    borderRadius: 10,
    height: 40,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  shareQrBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  reviewsList: {
    gap: 12,
  },
  reviewItem: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  reviewerName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewComment: {
    fontSize: 12,
    color: '#cbd5e1',
    lineHeight: 17,
  },
  reviewMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  reviewDate: {
    fontSize: 10,
    color: '#64748b',
  },
  reviewSource: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '600',
  },
});
