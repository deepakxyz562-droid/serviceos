import React, { useState } from 'react';
import {
  Alert,
  Dimensions,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import * as Haptics from 'expo-haptics';
import { colors } from '../ui';

export type TutorialVideoId =
  | 'why_photos'
  | 'boost_ranking'
  | 'performance_analysis'
  | 'reviews_trust'
  | 'how_to_get_reviews';

export interface TutorialVideoItem {
  id: TutorialVideoId;
  title: string;
  subtitle: string;
  videoUrl: string;
  ctaText: string;
  ctaIcon: keyof typeof MaterialIcons.glyphMap;
  takeawaysHeader: string;
  takeaways: Array<{ title: string; desc: string }>;
}

export const TUTORIAL_CATALOG: Record<TutorialVideoId, TutorialVideoItem> = {
  why_photos: {
    id: 'why_photos',
    title: 'Why Google Photos Matter',
    subtitle: 'GBP Growth Guide · 1:30 min',
    videoUrl: 'https://bgos.site/bgos/tutorials/why-gbp-photos.mp4',
    ctaText: 'Add Photos & Auto-Schedule Now',
    ctaIcon: 'add-a-photo',
    takeawaysHeader: 'Key Ranking Takeaways',
    takeaways: [
      {
        title: 'Google Maps #1 Signal:',
        desc: 'Frequent photo uploads signal to Google that your business is open, active, and customer-ready.',
      },
      {
        title: 'Hands-Free Drip Publishing:',
        desc: 'Bulk upload 5–10 photos once; BGOS AI automatically spaces them out across upcoming days.',
      },
      {
        title: 'AI Local SEO Optimization:',
        desc: 'Every photo is automatically tagged with local keywords, GPS metadata, and optimized categories.',
      },
    ],
  },
  boost_ranking: {
    id: 'boost_ranking',
    title: 'See Exactly How AI Boosts Your Google Ranking',
    subtitle: 'Automated Setup & AI Autopilot · 1:50 min',
    videoUrl: 'https://bgos.site/bgos/tutorials/boost-google-ranking.mp4',
    ctaText: 'Activate GBP AI Autopilot',
    ctaIcon: 'auto-awesome',
    takeawaysHeader: 'How AI Boosts Ranking',
    takeaways: [
      {
        title: 'Complete Profile Fingerprint:',
        desc: 'BGOS scans your business category, services, and neighborhood to match customer searches.',
      },
      {
        title: 'Continuous Background Sync:',
        desc: 'Automations continuously monitor Google changes, sync incoming reviews, and draft keyword-rich posts.',
      },
      {
        title: 'Active Profile Velocity:',
        desc: 'Consistent updates, photos, and reviews keep your business in the Google Maps Local 3-Pack.',
      },
    ],
  },
  performance_analysis: {
    id: 'performance_analysis',
    title: 'Is Your Google Business Profile Performing?',
    subtitle: 'GBP Performance & Geo-Grid Analysis · 3:39 min',
    videoUrl: 'https://bgos.site/bgos/tutorials/gbp-performance-analysis.mp4',
    ctaText: 'View Full Performance Report',
    ctaIcon: 'trending-up',
    takeawaysHeader: 'Performance Metrics That Matter',
    takeaways: [
      {
        title: 'Action-Driven Intent:',
        desc: 'Focus on Calls and Direction Requests — they represent customers ready to visit and buy right now.',
      },
      {
        title: '6-Month Compounding Trajectory:',
        desc: 'Local SEO is not overnight; monthly trends compound gradually into lasting market dominance.',
      },
      {
        title: 'Review Velocity Benchmark:',
        desc: 'Compare your weekly review intake against the local industry average (e.g., 8/week) to outrank nearby rivals.',
      },
    ],
  },
  reviews_trust: {
    id: 'reviews_trust',
    title: 'More Reviews = More Trust = More Customers',
    subtitle: 'Customer Trust & Conversion Strategy · 1:50 min',
    videoUrl: 'https://bgos.site/bgos/tutorials/reviews-build-trust.mp4',
    ctaText: 'Turn Customers into Reviews',
    ctaIcon: 'star',
    takeawaysHeader: 'Why Reviews Drive Sales',
    takeaways: [
      {
        title: '93% Buy on Ratings:',
        desc: 'Customers choose the business with frequent recent positive reviews over older stagnant listings.',
      },
      {
        title: 'Immediate Engagement:',
        desc: 'Request reviews within 30 minutes of a sale or visit when satisfaction and brand recall are highest.',
      },
      {
        title: 'Frictionless WhatsApp Link:',
        desc: 'Short branded links take customers straight to Google 5-star review submission in 1 tap.',
      },
    ],
  },
  how_to_get_reviews: {
    id: 'how_to_get_reviews',
    title: 'How to Get Reviews for Your Google Profile',
    subtitle: '1-Tap & Drip Follow-ups Guide · 1:11 min',
    videoUrl: 'https://bgos.site/bgos/tutorials/how-to-get-reviews.mp4',
    ctaText: 'Send Review Request Now',
    ctaIcon: 'send',
    takeawaysHeader: 'Step-by-Step Review Collection',
    takeaways: [
      {
        title: '1-Tap Quick Entry:',
        desc: 'Type the customer phone number and tap Send Review Link — takes under 10 seconds.',
      },
      {
        title: 'Automated Drip Follow-up:',
        desc: 'Customers who forget receive a gentle WhatsApp follow-up reminder after 2 days.',
      },
      {
        title: 'Tie Reviews to Sales:',
        desc: 'Keep "Ask for Google Review" enabled whenever logging new sales or customer leads.',
      },
    ],
  },
};

interface TutorialVideoModalProps {
  visible: boolean;
  onClose: () => void;
  onUploadNow?: () => void;
  onAction?: () => void;
  videoId?: TutorialVideoId;
  businessName?: string;
}

export function TutorialVideoModal({
  visible,
  onClose,
  onUploadNow,
  onAction,
  videoId = 'why_photos',
  businessName = 'Your Business',
}: TutorialVideoModalProps) {
  const [feedback, setFeedback] = useState<'like' | 'dislike' | null>(null);
  const [showTakeaways, setShowTakeaways] = useState(false);

  const videoData = TUTORIAL_CATALOG[videoId] || TUTORIAL_CATALOG.why_photos;

  const handleLike = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFeedback('like');
    Alert.alert('Thank you!', 'Glad you found this video helpful for your Google ranking.');
  };

  const handleDislike = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFeedback('dislike');
    Alert.alert('Feedback Received', 'Thanks for the feedback. We are constantly improving our growth guides.');
  };

  const handleActionClick = () => {
    onClose();
    if (onAction) {
      onAction();
    } else if (onUploadNow) {
      onUploadNow();
    }
  };

  const videoHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            background-color: #000000;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            width: 100vw;
            overflow: hidden;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          }
          video {
            width: 100%;
            height: 100%;
            object-fit: contain;
            background: #000;
          }
        </style>
      </head>
      <body>
        <video
          id="player"
          src="${videoData.videoUrl}"
          playsinline
          webkit-playsinline
          controls
          autoplay
        ></video>
      </body>
    </html>
  `;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* ── Header Row matching benchmark: Back | Title | Action ── */}
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onClose} style={styles.iconBtn}>
            <MaterialIcons name="arrow-back" size={24} color="#0F172A" />
          </Pressable>

          <View style={{ flex: 1, paddingHorizontal: 10 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {videoData.title}
            </Text>
            <Text style={styles.headerSub} numberOfLines={1}>
              {videoData.subtitle}
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={videoData.ctaText}
            onPress={handleActionClick}
            style={({ pressed }) => [styles.uploadNowBtn, pressed && { opacity: 0.8 }]}
          >
            <Text style={styles.uploadNowText} numberOfLines={1}>Action</Text>
            <MaterialIcons name="open-in-new" size={15} color="#0284C7" />
          </Pressable>
        </View>

        {/* ── Video Player Area ── */}
        <View style={styles.videoWrapper}>
          {Platform.OS === 'web' ? (
            React.createElement('video', {
              src: videoData.videoUrl,
              controls: true,
              autoPlay: true,
              playsInline: true,
              style: {
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                backgroundColor: '#000000',
              },
            })
          ) : (
            <WebView
              originWhitelist={['*']}
              source={{ html: videoHtml }}
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction={false}
              javaScriptEnabled
              style={styles.webView}
            />
          )}
        </View>

        {/* ── Bottom Interactive Strip: Did you like this video? ── */}
        <View style={styles.bottomBar}>
          <View style={styles.feedbackRow}>
            <Text style={styles.feedbackLabel}>Did you like this video?</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Pressable
                accessibilityRole="button"
                onPress={handleLike}
                style={[styles.feedbackBtn, feedback === 'like' && styles.feedbackBtnActive]}
              >
                <MaterialIcons
                  name="thumb-up"
                  size={16}
                  color={feedback === 'like' ? '#009F50' : '#475569'}
                />
                <Text style={[styles.feedbackBtnText, feedback === 'like' && { color: '#009F50', fontWeight: '800' }]}>
                  Like
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={handleDislike}
                style={[styles.feedbackBtn, feedback === 'dislike' && styles.feedbackBtnActive]}
              >
                <MaterialIcons
                  name="thumb-down"
                  size={16}
                  color={feedback === 'dislike' ? '#DC2626' : '#475569'}
                />
                <Text style={[styles.feedbackBtnText, feedback === 'dislike' && { color: '#DC2626', fontWeight: '800' }]}>
                  Dislike
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Quick Key Takeaways Expander */}
          <Pressable
            accessibilityRole="button"
            onPress={() => setShowTakeaways((v) => !v)}
            style={styles.takeawaysToggle}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <MaterialIcons name="auto-awesome" size={16} color="#0284C7" />
              <Text style={styles.takeawaysToggleText}>
                {videoData.takeawaysHeader} for {businessName}
              </Text>
            </View>
            <MaterialIcons
              name={showTakeaways ? 'expand-less' : 'expand-more'}
              size={18}
              color="#0284C7"
            />
          </Pressable>

          {showTakeaways ? (
            <ScrollView style={styles.takeawaysList} contentContainerStyle={{ gap: 8, paddingBottom: 10 }}>
              {videoData.takeaways.map((item, idx) => (
                <View key={idx} style={styles.takeawayItem}>
                  <MaterialIcons name="check-circle" size={16} color="#009F50" />
                  <Text style={styles.takeawayText}>
                    <Text style={{ fontWeight: '700' }}>{item.title} </Text>
                    {item.desc}
                  </Text>
                </View>
              ))}
            </ScrollView>
          ) : null}

          {/* Direct CTA */}
          <Pressable
            accessibilityRole="button"
            onPress={handleActionClick}
            style={({ pressed }) => [styles.mainCtaBtn, pressed && { opacity: 0.9 }]}
          >
            <MaterialIcons name={videoData.ctaIcon} size={18} color="#FFFFFF" />
            <Text style={styles.mainCtaBtnText}>{videoData.ctaText}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    paddingTop: Platform.OS === 'ios' ? 48 : 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  iconBtn: {
    padding: 6,
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  headerSub: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 1,
  },
  uploadNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  uploadNowText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0284C7',
  },
  videoWrapper: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  webView: {
    flex: 1,
    width: Dimensions.get('window').width,
    backgroundColor: '#000000',
  },
  bottomBar: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  feedbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  feedbackLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  feedbackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  feedbackBtnActive: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  feedbackBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  takeawaysToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  takeawaysToggleText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0284C7',
  },
  takeawaysList: {
    maxHeight: 140,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EEF2F6',
  },
  takeawayItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  takeawayText: {
    fontSize: 11.5,
    color: '#334155',
    flex: 1,
    lineHeight: 16,
  },
  mainCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2563EB',
    paddingVertical: 13,
    borderRadius: 12,
    marginTop: 4,
    elevation: 2,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  mainCtaBtnText: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
