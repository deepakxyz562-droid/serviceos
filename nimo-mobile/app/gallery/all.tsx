import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { THEME } from '../../src/theme/tokens';
import { useAppStore } from '../../src/store/useAppStore';

const { width } = Dimensions.get('window');
const ITEM_WIDTH = (width - 48) / 3;

export default function PhotosAllScreen() {
  const router = useRouter();
  const { galleryItems, deleteCreation } = useAppStore();
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    Alert.alert(
      'Delete Selected Photos',
      `Are you sure you want to delete ${selectedIds.length} selected portrait(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            for (const id of selectedIds) {
              await deleteCreation(id);
            }
            setSelectedIds([]);
            setIsSelectMode(false);
          },
        },
      ]
    );
  };

  const handleDeleteAll = () => {
    Alert.alert(
      'Delete All Photos',
      'This will permanently delete all your generated photos from NIMO. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            for (const item of galleryItems) {
              await deleteCreation(item.id);
            }
            setSelectedIds([]);
            setIsSelectMode(false);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#FFF" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>All Creations ({galleryItems.length})</Text>

        <TouchableOpacity
          style={styles.selectToggleBtn}
          onPress={() => {
            setIsSelectMode(!isSelectMode);
            setSelectedIds([]);
          }}
        >
          <Text style={styles.selectToggleText}>
            {isSelectMode ? 'Done' : 'Select'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Grid */}
      <FlatList
        data={galleryItems}
        keyExtractor={(item) => item.id}
        numColumns={3}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const isSelected = selectedIds.includes(item.id);
          return (
            <TouchableOpacity
              style={styles.gridItem}
              activeOpacity={0.85}
              onPress={() => {
                if (isSelectMode) {
                  toggleSelect(item.id);
                }
              }}
            >
              <Image source={{ uri: item.thumbnail_path || item.storage_path }} style={styles.image} />
              {isSelectMode && (
                <View style={styles.selectOverlay}>
                  <Ionicons
                    name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                    size={22}
                    color={isSelected ? THEME.colors.accentViolet : '#FFF'}
                  />
                </View>
              )}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="images-outline" size={48} color={THEME.colors.textMuted} />
            <Text style={styles.emptyText}>No creations yet</Text>
          </View>
        }
      />

      {/* Bottom Batch Actions Toolbar */}
      {isSelectMode && (
        <View style={styles.batchBar}>
          <TouchableOpacity
            style={[styles.batchBtn, styles.deleteSelectedBtn]}
            onPress={handleDeleteSelected}
            disabled={selectedIds.length === 0}
          >
            <Ionicons name="trash" size={16} color={THEME.colors.error} />
            <Text style={styles.deleteSelectedText}>
              Delete Selected ({selectedIds.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.deleteAllBtn} onPress={handleDeleteAll}>
            <Text style={styles.deleteAllText}>Delete All</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.colors.bgPrimary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  selectToggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  selectToggleText: {
    color: THEME.colors.accentViolet,
    fontSize: 14,
    fontWeight: '700',
  },
  listContent: {
    padding: 12,
    gap: 8,
  },
  gridItem: {
    width: ITEM_WIDTH,
    height: ITEM_WIDTH * 1.3,
    borderRadius: THEME.radii.md,
    overflow: 'hidden',
    backgroundColor: THEME.colors.bgCard,
    marginRight: 8,
    marginBottom: 8,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  selectOverlay: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 12,
  },
  emptyText: {
    color: THEME.colors.textMuted,
    fontSize: 15,
  },
  batchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: THEME.colors.bgSecondary,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },
  batchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  deleteSelectedBtn: {
    opacity: 1,
  },
  deleteSelectedText: {
    color: THEME.colors.error,
    fontWeight: '700',
    fontSize: 14,
  },
  deleteAllBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  deleteAllText: {
    color: THEME.colors.textMuted,
    fontWeight: '600',
    fontSize: 13,
  },
});
