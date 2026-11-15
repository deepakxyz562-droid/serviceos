import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { THEME } from '../../src/theme/tokens';
import { NimoLogo } from '../../src/components/NimoLogo';
import { useAppStore, TemplateItem } from '../../src/store/useAppStore';

const { width } = Dimensions.get('window');
const GRID_SPACING = 10;
const CARD_WIDTH = (width - 40 - GRID_SPACING * 2) / 3;

export default function ExploreScreen() {
  const router = useRouter();
  const {
    coinsAvailable,
    exploreCategory,
    setExploreCategory,
    templates,
    selectTemplate,
  } = useAppStore();

  const categories: ('Couple' | 'Wishes' | 'Refoto')[] = ['Couple', 'Wishes', 'Refoto'];

  const getCategoryIcon = (cat: 'Couple' | 'Wishes' | 'Refoto') => {
    switch (cat) {
      case 'Couple':
        return <Ionicons name="heart" size={16} color="#FFF" style={{ marginRight: 6 }} />;
      case 'Wishes':
        return <Ionicons name="gift-outline" size={16} color={THEME.colors.textSecondary} style={{ marginRight: 6 }} />;
      case 'Refoto':
        return <Ionicons name="repeat-outline" size={16} color={THEME.colors.textSecondary} style={{ marginRight: 6 }} />;
    }
  };

  const filteredTemplates = templates.filter((t) => {
    if (exploreCategory === 'Couple') return true; // Show all or selected category
    return t.category === exploreCategory;
  });

  const handleTemplatePress = (template: TemplateItem) => {
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
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header Bar */}
        <View style={styles.headerBar}>
          <NimoLogo size="small" showText showTagline />

          <View style={styles.headerRight}>
            {/* Coin Pill: (S) 245 + */}
            <TouchableOpacity
              style={styles.coinPill}
              onPress={() => router.push('/coins')}
              activeOpacity={0.8}
            >
              <View style={styles.goldCoinCircle}>
                <Text style={styles.goldCoinDollar}>$</Text>
              </View>
              <Text style={styles.coinAmount}>{coinsAvailable}</Text>
              <Ionicons name="add" size={14} color="#A79EC4" style={{ marginLeft: 4 }} />
            </TouchableOpacity>

            {/* Notification Bell with Red Badge */}
            <TouchableOpacity style={styles.bellBtn} activeOpacity={0.8}>
              <Ionicons name="notifications-outline" size={22} color="#FFF" />
              <View style={styles.unreadDot} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Hero Section: AI Portrait Studio */}
        <View style={styles.heroSection}>
          <View style={styles.heroTextContainer}>
            <View style={styles.heroTitleRow}>
              <Text style={styles.heroAiText}>AI </Text>
              <Text style={styles.heroStudioText}>Portrait Studio</Text>
            </View>
            <Text style={styles.heroSubtitle}>One photo. A whole new you.</Text>
          </View>

          {/* Model with Neon Purple Portal Aura */}
          <View style={styles.portalContainer}>
            <View style={styles.neonRing} />
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80' }}
              style={styles.portalModelImg}
            />
          </View>
        </View>

        {/* Category Filter Chips */}
        <View style={styles.categoriesRow}>
          {categories.map((cat) => {
            const isActive = exploreCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryChip, isActive && styles.categoryChipActive]}
                onPress={() => setExploreCategory(cat)}
                activeOpacity={0.85}
              >
                {getCategoryIcon(cat)}
                <Text style={[styles.categoryChipText, isActive && styles.categoryChipTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 3x3 Template Grid */}
        <View style={styles.gridContainer}>
          {filteredTemplates.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.templateCard}
              onPress={() => handleTemplatePress(item)}
              activeOpacity={0.88}
            >
              <Image source={{ uri: item.thumbnail_url }} style={styles.cardThumbnail} />
              
              {/* Bottom Card Overlay with Title and Circular Arrow Button */}
              <View style={styles.cardFooterOverlay}>
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                <View style={styles.arrowCircle}>
                  <Ionicons name="arrow-forward" size={11} color="#FFF" />
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Value Proposition Footer Card */}
        <View style={styles.valuePropCard}>
          {/* Left: Face-preserving AI */}
          <View style={styles.valuePropCol}>
            <View style={styles.valueIconBox}>
              <Ionicons name="scan-outline" size={20} color="#C084FC" />
            </View>
            <View style={styles.valueTextBox}>
              <Text style={styles.valueTitle}>Face-preserving AI</Text>
              <Text style={styles.valueDesc}>Your natural look, enhanced beautifully</Text>
            </View>
          </View>

          <View style={styles.valueDivider} />

          {/* Right: Upload 1 Photo */}
          <View style={styles.valuePropCol}>
            <View style={styles.valueIconBox}>
              <Ionicons name="cloud-upload-outline" size={20} color="#C084FC" />
            </View>
            <View style={styles.valueTextBox}>
              <Text style={styles.valueTitle}>Upload 1 Photo</Text>
              <Text style={styles.valueDesc}>Get stunning results</Text>
            </View>
          </View>
        </View>
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
    paddingTop: 8,
    paddingBottom: 36,
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  coinPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.bgCard,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: THEME.radii.pill,
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
  },
  goldCoinCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  goldCoinDollar: {
    color: '#78350F',
    fontSize: 12,
    fontWeight: '900',
  },
  coinAmount: {
    color: THEME.colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  bellBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: THEME.colors.bgCard,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
  },
  unreadDot: {
    position: 'absolute',
    top: 7,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  heroSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 10,
    height: 94,
  },
  heroTextContainer: {
    flex: 1,
  },
  heroTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroAiText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFF',
  },
  heroStudioText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#C084FC',
  },
  heroSubtitle: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    marginTop: 4,
  },
  portalContainer: {
    width: 90,
    height: 90,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  neonRing: {
    position: 'absolute',
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 2,
    borderColor: '#A855F7',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 6,
  },
  portalModelImg: {
    width: 76,
    height: 76,
    borderRadius: 38,
  },
  categoriesRow: {
    flexDirection: 'row',
    gap: 10,
    marginVertical: 14,
  },
  categoryChip: {
    flex: 1,
    height: 42,
    backgroundColor: THEME.colors.bgCard,
    borderRadius: THEME.radii.pill,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
  },
  categoryChipActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#8B5CF6',
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
  },
  categoryChipTextActive: {
    color: '#FFF',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_SPACING,
    marginVertical: 12,
  },
  templateCard: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 1.35,
    borderRadius: THEME.radii.lg,
    overflow: 'hidden',
    backgroundColor: THEME.colors.bgCard,
    position: 'relative',
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
  },
  cardThumbnail: {
    width: '100%',
    height: '100%',
  },
  cardFooterOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(8, 0, 20, 0.82)',
    paddingHorizontal: 8,
    paddingVertical: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    flex: 1,
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
    lineHeight: 13,
    marginRight: 4,
  },
  arrowCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center',
  },
  valuePropCard: {
    marginTop: 16,
    backgroundColor: '#1E103E',
    borderRadius: THEME.radii.xl,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(139, 92, 246, 0.35)',
  },
  valuePropCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  valueIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(139, 92, 246, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  valueTextBox: {
    flex: 1,
  },
  valueTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFF',
  },
  valueDesc: {
    fontSize: 9.5,
    color: '#C084FC',
    marginTop: 2,
    lineHeight: 12,
  },
  valueDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
    marginHorizontal: 8,
  },
});
