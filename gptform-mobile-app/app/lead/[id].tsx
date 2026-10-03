import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Linking,
  SafeAreaView,
  StatusBar,
  StyleSheet,
} from 'react-native';
import { Ionicons, Feather, FontAwesome5 } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { hapticFeedback } from '@/lib/haptics';

export default function LeadDetailModal() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const handleCall = () => {
    hapticFeedback.medium();
    Linking.openURL('tel:+15125550192');
  };

  const handleWhatsApp = () => {
    hapticFeedback.medium();
    Linking.openURL('whatsapp://send?phone=15125550192&text=Hi%20John');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.inner}>
        {/* Top Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerEyebrow}>Lead Dossier</Text>
            <Text style={styles.headerTitle}>John Smith</Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              hapticFeedback.light();
              router.back();
            }}
            style={styles.closeBtn}
          >
            <Ionicons name="close" size={18} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Quick Actions Row */}
          <View style={styles.actionRow}>
            <TouchableOpacity onPress={handleCall} style={styles.callBtn}>
              <Ionicons name="call" size={15} color="#022C22" style={{ marginRight: 6 }} />
              <Text style={styles.callBtnText}>Call Now</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleWhatsApp} style={styles.whatsAppBtn}>
              <FontAwesome5 name="whatsapp" size={15} color="#14B8A6" style={{ marginRight: 6 }} />
              <Text style={styles.whatsAppBtnText}>WhatsApp</Text>
            </TouchableOpacity>
          </View>

          {/* AI Qualification Card */}
          <View style={styles.aiCard}>
            <View style={styles.aiCardHeader}>
              <Ionicons name="sparkles" size={16} color="#10B981" style={{ marginRight: 6 }} />
              <Text style={styles.aiCardTitle}>AI Qualification Summary</Text>
            </View>
            <Text style={styles.aiCardBody}>
              High intent prospect. Resident in Central Austin, reported heat pump blowing warm air. Willing to pay diagnostic fee of $89 and requested early morning emergency visit tomorrow.
            </Text>
          </View>

          {/* Form Answers Grid */}
          <View style={styles.dataCard}>
            <Text style={styles.dataCardTitle}>Intake Form Data</Text>

            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>Service Type:</Text>
              <Text style={styles.dataValue}>HVAC Compressor Repair</Text>
            </View>

            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>Location:</Text>
              <Text style={styles.dataValue}>Austin, TX 78701</Text>
            </View>

            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>Preferred Date:</Text>
              <Text style={styles.dataValue}>Tomorrow (09:00 - 11:00 AM)</Text>
            </View>

            <View style={[styles.dataRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.dataLabel}>Estimated Value:</Text>
              <Text style={styles.valueHighlight}>$850.00</Text>
            </View>
          </View>

          {/* Stage Progression Action */}
          <View style={styles.footerAction}>
            <TouchableOpacity
              onPress={async () => {
                await hapticFeedback.success();
                router.back();
              }}
              style={styles.wonBtn}
            >
              <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.wonBtnText}>Mark as Contacted &amp; Won</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  inner: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  headerEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    color: '#34D399',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    marginTop: 16,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  callBtn: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  callBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#022C22',
  },
  whatsAppBtn: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.4)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  whatsAppBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#5EEAD4',
  },
  aiCard: {
    padding: 16,
    borderRadius: 20,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    marginBottom: 16,
  },
  aiCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  aiCardTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  aiCardBody: {
    fontSize: 12,
    color: '#CBD5E1',
    lineHeight: 18,
    fontWeight: '500',
  },
  dataCard: {
    padding: 16,
    borderRadius: 20,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 20,
  },
  dataCardTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  dataLabel: {
    fontSize: 12,
    color: '#94A3B8',
  },
  dataValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  valueHighlight: {
    fontSize: 14,
    fontWeight: '900',
    color: '#34D399',
  },
  footerAction: {
    paddingBottom: 30,
  },
  wonBtn: {
    height: 48,
    borderRadius: 14,
    backgroundColor: '#059669',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wonBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
