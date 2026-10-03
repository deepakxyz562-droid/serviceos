import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  TextInput,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { hapticFeedback } from '@/lib/haptics';

export default function ArchivesScreen() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      {/* Header: < Archives (matches 18.35.52.jpeg) */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <MaterialIcons name="arrow-back-ios" size={20} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Archives</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBox}>
          <MaterialIcons name="search" size={20} color="#64748b" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search Archives"
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Filters Bar: Date v, Order v, Rating v, Teammate v */}
      <View style={styles.filtersBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          <TouchableOpacity style={styles.filterChip} onPress={() => hapticFeedback.light()}>
            <MaterialIcons name="calendar-today" size={14} color="#1e293b" style={{ marginRight: 6 }} />
            <Text style={styles.filterChipText}>Date</Text>
            <MaterialIcons name="keyboard-arrow-down" size={16} color="#64748b" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.filterChip} onPress={() => hapticFeedback.light()}>
            <MaterialIcons name="attach-money" size={15} color="#1e293b" style={{ marginRight: 4 }} />
            <Text style={styles.filterChipText}>Order</Text>
            <MaterialIcons name="keyboard-arrow-down" size={16} color="#64748b" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.filterChip} onPress={() => hapticFeedback.light()}>
            <MaterialIcons name="thumb-up-alt" size={14} color="#1e293b" style={{ marginRight: 6 }} />
            <Text style={styles.filterChipText}>Rating</Text>
            <MaterialIcons name="keyboard-arrow-down" size={16} color="#64748b" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.filterChip} onPress={() => hapticFeedback.light()}>
            <MaterialIcons name="person-outline" size={16} color="#1e293b" style={{ marginRight: 6 }} />
            <Text style={styles.filterChipText}>Teammate</Text>
            <MaterialIcons name="keyboard-arrow-down" size={16} color="#64748b" />
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Empty State: No archived chats */}
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconCircle}>
          <MaterialIcons name="chat-bubble-outline" size={54} color="#94a3b8" />
        </View>
        <Text style={styles.emptyTitle}>No archived chats</Text>
        <Text style={styles.emptySub}>Closed chats will show up here.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  searchWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
  },
  filtersBar: {
    paddingVertical: 8,
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
    marginRight: 4,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 80,
  },
  emptyIconCircle: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    color: '#64748b',
  },
});
