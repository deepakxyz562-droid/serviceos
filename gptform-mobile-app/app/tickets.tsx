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
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { hapticFeedback } from '@/lib/haptics';

export default function TicketsScreen() {
  const [search, setSearch] = useState('');

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      {/* Header: < Tickets + (matches 18.35.49.jpeg) */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <MaterialIcons name="arrow-back-ios" size={20} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tickets</Text>
        <TouchableOpacity
          onPress={() => {
            hapticFeedback.light();
            Alert.prompt
              ? Alert.prompt('New Ticket', 'Enter customer inquiry or subject', (text) => {
                  if (text) Alert.alert('Ticket Created', `Created: ${text}`);
                })
              : Alert.alert('New Ticket', 'Creating a new ticket manually');
          }}
          style={styles.backBtn}
        >
          <MaterialIcons name="add" size={26} color="#0f172a" />
        </TouchableOpacity>
      </View>

      {/* Search in All tickets */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBox}>
          <MaterialIcons name="search" size={20} color="#64748b" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search in All tickets"
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* VIEWS Section */}
        <Text style={styles.sectionHeader}>VIEWS</Text>
        <View style={styles.cardGroup}>
          <TouchableOpacity
            style={styles.rowItem}
            onPress={() => hapticFeedback.light()}
            activeOpacity={0.7}
          >
            <View style={styles.rowLeft}>
              <MaterialIcons name="person-outline" size={20} color="#1e293b" style={{ marginRight: 12 }} />
              <Text style={styles.rowTitle}>My recent tickets</Text>
            </View>
            <View style={styles.rowRight}>
              <View style={styles.countPill}>
                <Text style={styles.countPillText}>0</Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
            </View>
          </TouchableOpacity>
        </View>

        {/* STATUSES Section */}
        <Text style={styles.sectionHeader}>STATUSES</Text>
        <View style={styles.cardGroup}>
          <TouchableOpacity style={styles.rowItem} activeOpacity={0.7}>
            <View style={styles.rowLeft}>
              <MaterialIcons name="confirmation-number" size={20} color="#1e293b" style={{ marginRight: 12 }} />
              <Text style={styles.rowTitle}>All</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
          </TouchableOpacity>

          <View style={styles.rowDivider} />

          <TouchableOpacity style={styles.rowItem} activeOpacity={0.7}>
            <View style={styles.rowLeft}>
              <MaterialIcons name="account-circle" size={20} color="#1e293b" style={{ marginRight: 12 }} />
              <Text style={styles.rowTitle}>Unassigned</Text>
            </View>
            <View style={styles.rowRight}>
              <View style={styles.countPill}>
                <Text style={styles.countPillText}>1</Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
            </View>
          </TouchableOpacity>

          <View style={styles.rowDivider} />

          <TouchableOpacity style={styles.rowItem} activeOpacity={0.7}>
            <View style={styles.rowLeft}>
              <MaterialIcons name="person-outline" size={20} color="#1e293b" style={{ marginRight: 12 }} />
              <Text style={styles.rowTitle}>My open</Text>
            </View>
            <View style={styles.rowRight}>
              <View style={styles.countPill}>
                <Text style={styles.countPillText}>0</Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Status Lifecycle Group */}
        <View style={[styles.cardGroup, { marginTop: 12 }]}>
          <TouchableOpacity style={styles.rowItem} activeOpacity={0.7}>
            <View style={styles.rowLeft}>
              <MaterialIcons name="play-arrow" size={20} color="#1e293b" style={{ marginRight: 12 }} />
              <Text style={styles.rowTitle}>Open</Text>
            </View>
            <View style={styles.rowRight}>
              <View style={styles.countPill}>
                <Text style={styles.countPillText}>1</Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
            </View>
          </TouchableOpacity>

          <View style={styles.rowDivider} />

          <TouchableOpacity style={styles.rowItem} activeOpacity={0.7}>
            <View style={styles.rowLeft}>
              <MaterialIcons name="hourglass-empty" size={20} color="#1e293b" style={{ marginRight: 12 }} />
              <Text style={styles.rowTitle}>Pending</Text>
            </View>
            <View style={styles.rowRight}>
              <View style={styles.countPill}>
                <Text style={styles.countPillText}>0</Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
            </View>
          </TouchableOpacity>

          <View style={styles.rowDivider} />

          <TouchableOpacity style={styles.rowItem} activeOpacity={0.7}>
            <View style={styles.rowLeft}>
              <MaterialIcons name="pause" size={20} color="#1e293b" style={{ marginRight: 12 }} />
              <Text style={styles.rowTitle}>On hold</Text>
            </View>
            <View style={styles.rowRight}>
              <View style={styles.countPill}>
                <Text style={styles.countPillText}>0</Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
            </View>
          </TouchableOpacity>

          <View style={styles.rowDivider} />

          <TouchableOpacity style={styles.rowItem} activeOpacity={0.7}>
            <View style={styles.rowLeft}>
              <MaterialIcons name="check" size={20} color="#1e293b" style={{ marginRight: 12 }} />
              <Text style={styles.rowTitle}>Solved</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
          </TouchableOpacity>

          <View style={styles.rowDivider} />

          <TouchableOpacity style={styles.rowItem} activeOpacity={0.7}>
            <View style={styles.rowLeft}>
              <MaterialIcons name="done-all" size={20} color="#1e293b" style={{ marginRight: 12 }} />
              <Text style={styles.rowTitle}>Closed</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {/* Spam, Archive, Trash Group */}
        <View style={[styles.cardGroup, { marginTop: 12 }]}>
          <TouchableOpacity style={styles.rowItem} activeOpacity={0.7}>
            <View style={styles.rowLeft}>
              <MaterialIcons name="error-outline" size={20} color="#1e293b" style={{ marginRight: 12 }} />
              <Text style={styles.rowTitle}>Spam</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
          </TouchableOpacity>

          <View style={styles.rowDivider} />

          <TouchableOpacity style={styles.rowItem} activeOpacity={0.7}>
            <View style={styles.rowLeft}>
              <MaterialIcons name="archive" size={20} color="#1e293b" style={{ marginRight: 12 }} />
              <Text style={styles.rowTitle}>Archive</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
          </TouchableOpacity>

          <View style={styles.rowDivider} />

          <TouchableOpacity style={styles.rowItem} activeOpacity={0.7}>
            <View style={styles.rowLeft}>
              <MaterialIcons name="delete-outline" size={20} color="#1e293b" style={{ marginRight: 12 }} />
              <Text style={styles.rowTitle}>Trash</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 40,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.5,
    marginTop: 14,
    marginBottom: 8,
  },
  cardGroup: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    overflow: 'hidden',
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  countPill: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  rowDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginLeft: 48,
  },
});
