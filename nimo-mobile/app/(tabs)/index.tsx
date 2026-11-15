import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { THEME } from '../../src/theme/tokens';
import { useAppStore, TemplateItem, INITIAL_STYLES } from '../../src/store/useAppStore';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
  const {
    coinsAvailable,
    fetchBalance,
    templates,
    fetchTemplates,
    selectTemplate,
    selectStyle,
  } = useAppStore();

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchBalance();
    fetchTemplates();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchBalance(), fetchTemplates()]);
    setRefreshing(false);
  };

  const handleOpenPhotoStudio = () => {
    router.push('/photo-studio');
  };

  const handleOpenVideoStudio = () => {
    router.push('/video-studio');
  };

  const handleSelectTemplate = (template: TemplateItem) => {
    selectTemplate(template);
    router.push({
      pathname: '/template/[id]',
      params: { id: template.id },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFF" />}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header: Greeting & Crown */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greetingTitle}>Hello, Creator! 👋</Text>
            <Text style={styles.greetingSubtitle}>Let's bring your ideas to life</Text>
          </View>

          <TouchableOpacity
            style={styles.crownBtn}
            onPress={() => router.push('/paywall')}
            activeOpacity={0.8}
          >
            <Ionicons name="sparkles" size={20} color="#FBBF24" />
          </TouchableOpacity>
        </View>

        {/* Credits Card: 💎 250 Credits | View → */}
        <TouchableOpacity
          style={styles.creditsCard}
          onPress={() => router.push('/coins')}
          activeOpacity={0.85}
        >
          <View style={styles.creditsLeft}>
            <Text style={styles.diamondEmoji}>💎</Text>
            <Text style={styles.creditsAmount}>{coinsAvailable} Credits</Text>
          </View>
          <View style={styles.creditsRight}>
            <Text style={styles.viewText}>View</Text>
            <Ionicons name="arrow-forward" size={14} color="#A79EC4" style={{ marginLeft: 4 }} />
          </View>
        </TouchableOpacity>

        {/* Hero Banner: Turn Photos into Videos */}
        <TouchableOpacity
          style={styles.heroBanner}
          onPress={handleOpenVideoStudio}
          activeOpacity={0.9}
        >
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80' }}
            style={styles.heroBgImg}
          />
          <View style={styles.heroOverlay}>
            <View style={styles.heroTextContainer}>
              <Text style={styles.heroTitle}>Turn Photos{"\n"}into Videos</Text>
              <Text style={styles.heroSubtitle}>Explore AI Video Studio</Text>
            </View>

            <View style={styles.playBtnCircle}>
              <Ionicons name="play" size={24} color="#FFF" style={{ marginLeft: 3 }} />
            </View>
          </View>
        </TouchableOpacity>

        {/* Dual Studio Action Hub (Side-by-Side) */}
        <View style={styles.dualStudioRow}>
          {/* AI Photo Studio */}
          <TouchableOpacity
            style={styles.studioCard}
            onPress={handleOpenPhotoStudio}
            activeOpacity={0.85}
          >
            <View style={[styles.studioIconCircle, { backgroundColor: 'rgba(139, 92, 246, 0.25)' }]}>
              <Ionicons name="camera" size={24} color={THEME.colors.accentViolet} />
            </View>
            <Text style={styles.studioCardTitle}>AI Photo{"\n"}Studio</Text>
          </TouchableOpacity>

          {/* AI Video Studio */}
          <TouchableOpacity
            style={styles.studioCard}
            onPress={handleOpenVideoStudio}
            activeOpacity={0.85}
          >
            <View style={[styles.studioIconCircle, { backgroundColor: 'rgba(236, 72, 153, 0.25)' }]}>
              <Ionicons name="videocam" size={24} color={THEME.colors.accentMagenta} />
            </View>
            <Text style={styles.studioCardTitle}>AI Video{"\n"}Studio</Text>
          </TouchableOpacity>
        </View>

        {/* Trending Templates Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Trending Templates</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/explore')}>
            <Text style={styles.seeAllText}>See All →</Text>
          </TouchableOpacity>
        </View>

        {/* Horizontal Rail of Trending Templates */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.trendingRail}
        >
          {templates.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.templateCard}
              onPress={() => handleSelectTemplate(item)}
              activeOpacity={0.85}
            >
              <Image source={{ uri: item.thumbnail_url }} style={styles.templateImg} />
              <View style={styles.templateGradient}>
                <Text style={styles.templateName} numberOfLines={1}>
                  {item.title}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.colors.bgPrimary,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  greetingTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  greetingSubtitle: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  crownBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: THEME.colors.bgCard,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#7C3AED',
  },
  creditsCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: THEME.colors.bgCard,
    borderRadius: THEME.radii.lg,
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
  },
  creditsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  diamondEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  creditsAmount: {
    fontSize: 17,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  creditsRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewText: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
    fontWeight: '600',
  },
  heroBanner: {
    width: '100%',
    height: 160,
    borderRadius: THEME.radii.xl,
    overflow: 'hidden',
    marginBottom: 20,
    position: 'relative',
    borderWidth: 1.5,
    borderColor: 'rgba(139, 92, 246, 0.4)',
  },
  heroBgImg: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(14, 4, 34, 0.72)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
  },
  heroTextContainer: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFF',
    lineHeight: 28,
  },
  heroSubtitle: {
    fontSize: 13,
    color: THEME.colors.accentViolet,
    marginTop: 6,
    fontWeight: '600',
  },
  playBtnCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: THEME.colors.accentViolet,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#C084FC',
  },
  dualStudioRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 24,
  },
  studioCard: {
    flex: 1,
    backgroundColor: THEME.colors.bgCard,
    borderRadius: THEME.radii.xl,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
  },
  studioIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  studioCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    textAlign: 'center',
    lineHeight: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  seeAllText: {
    fontSize: 13,
    color: THEME.colors.accentViolet,
    fontWeight: '700',
  },
  trendingRail: {
    gap: 12,
    paddingBottom: 8,
  },
  templateCard: {
    width: 105,
    height: 140,
    borderRadius: THEME.radii.lg,
    overflow: 'hidden',
    backgroundColor: THEME.colors.bgCard,
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
  },
  templateImg: {
    width: '100%',
    height: '100%',
  },
  templateGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 6,
    backgroundColor: 'rgba(8, 0, 20, 0.7)',
  },
  templateName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
    textAlign: 'center',
  },
});
