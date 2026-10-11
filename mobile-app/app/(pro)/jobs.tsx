/**
 * Fieseros Pro — Jobs Pipeline & Execution Command Center
 * Covers:
 *   - Screen 11: Active Jobs Pipeline (Tabs: Upcoming, In Progress, Completed)
 *   - Screen 12: Job Command Center (GPS Route, Arrival, Work Timer)
 *   - Screen 21: On-Site Checklist & Before/After Photo Proof
 *   - Screen 22: Completion Sign-Off & Digital Signature
 *
 * Uses Fieseros Emerald Brand tokens (#059669)
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Briefcase,
  MapPin,
  Clock,
  Phone,
  Navigation,
  CheckCircle2,
  AlertCircle,
  Camera,
  FileCheck,
  ChevronRight,
  X,
  Play,
  Square,
  ShieldCheck,
  User,
  ArrowRight,
} from 'lucide-react-native';

type JobStatus = 'scheduled' | 'en_route' | 'arrived' | 'in_progress' | 'completed';

interface Job {
  id: string;
  orderNumber: string;
  title: string;
  category: string;
  customerName: string;
  customerPhone: string;
  address: string;
  scheduledTime: string;
  amount: number;
  status: JobStatus;
  notes: string;
  gateCode?: string;
}

const INITIAL_JOBS: Job[] = [
  {
    id: 'job-1',
    orderNumber: '#FS-8201',
    title: 'Kitchen Pipe Burst & Sink Trap Replacement',
    category: 'Plumbing',
    customerName: 'Vikram Roy',
    customerPhone: '+91 98450 12345',
    address: 'Flat 402, Prestige Tower, Indiranagar 12th Main',
    scheduledTime: 'Today at 3:30 PM',
    amount: 1200,
    status: 'en_route',
    notes: 'Shut-off valve is under the sink behind the dustbin drawer.',
    gateCode: '4020',
  },
  {
    id: 'job-2',
    orderNumber: '#FS-8202',
    title: 'Daikin 1.5T AC Deep Cleaning & Freon Top-up',
    category: 'AC & HVAC',
    customerName: 'Meenakshi Iyer',
    customerPhone: '+91 98860 67890',
    address: '14, 2nd Cross, Domlur Layout',
    scheduledTime: 'Today at 5:00 PM',
    amount: 1650,
    status: 'scheduled',
    notes: 'Balcony ladder available in utility area.',
  },
  {
    id: 'job-3',
    orderNumber: '#FS-8199',
    title: 'Main MCB Spark Fix & Breaker Replacement',
    category: 'Electrical',
    customerName: 'Rahul Verma',
    customerPhone: '+91 99001 22334',
    address: '88, 5th Main, Koramangala 4th Block',
    scheduledTime: 'Completed today at 1:15 PM',
    amount: 950,
    status: 'completed',
    notes: 'Replaced 32A C-Curve breaker with Havells Euro-II.',
  },
];

export default function ProJobsScreen() {
  const [pipelineTab, setPipelineTab] = useState<'active' | 'completed'>('active');
  const [jobs, setJobs] = useState<Job[]>(INITIAL_JOBS);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  // Screen 21 & 22 On-Site Verification State
  const [checklist, setChecklist] = useState({
    siteSafetyChecked: false,
    beforePhotoTaken: false,
    workCompleted: false,
    afterPhotoTaken: false,
    customerSignatureObtained: false,
  });

  const activeJobs = jobs.filter((j) => j.status !== 'completed');
  const completedJobs = jobs.filter((j) => j.status === 'completed');

  const advanceJobStatus = (jobId: string, nextStatus: JobStatus) => {
    setJobs((prev) =>
      prev.map((j) => (j.id === jobId ? { ...j, status: nextStatus } : j))
    );
    if (selectedJob && selectedJob.id === jobId) {
      setSelectedJob((prev) => (prev ? { ...prev, status: nextStatus } : null));
    }
    Alert.alert('Status Updated', `Job marked as: ${nextStatus.replace('_', ' ').toUpperCase()}`);
  };

  const handleCompleteJob = (jobId: string) => {
    if (!checklist.beforePhotoTaken || !checklist.afterPhotoTaken) {
      Alert.alert('Photo Proof Required', 'Please confirm before and after photos are captured.');
      return;
    }
    advanceJobStatus(jobId, 'completed');
    setSelectedJob(null);
    Alert.alert('Job Completed! 🎉', 'Invoice generated and payout of ₹1,200 scheduled to your linked bank account.');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>
      {/* Top Header */}
      <View
        style={{
          backgroundColor: '#fff',
          borderBottomWidth: 1,
          borderBottomColor: '#E2E8F0',
          paddingHorizontal: 16,
          paddingTop: 8,
          paddingBottom: 12,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ fontSize: 20, fontWeight: '700', color: '#0F172A' }}>Jobs Pipeline</Text>
            <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
              {activeJobs.length} Active · {completedJobs.length} Completed Today
            </Text>
          </View>
        </View>

        {/* Tab switch */}
        <View style={{ flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 10, padding: 3, marginTop: 12 }}>
          <Pressable
            onPress={() => setPipelineTab('active')}
            style={{
              flex: 1,
              paddingVertical: 7,
              alignItems: 'center',
              borderRadius: 8,
              backgroundColor: pipelineTab === 'active' ? '#fff' : 'transparent',
              shadowColor: pipelineTab === 'active' ? '#000' : 'transparent',
              shadowOpacity: pipelineTab === 'active' ? 0.05 : 0,
              shadowRadius: 2,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: pipelineTab === 'active' ? '700' : '500',
                color: pipelineTab === 'active' ? '#059669' : '#64748B',
              }}
            >
              Active Jobs ({activeJobs.length})
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setPipelineTab('completed')}
            style={{
              flex: 1,
              paddingVertical: 7,
              alignItems: 'center',
              borderRadius: 8,
              backgroundColor: pipelineTab === 'completed' ? '#fff' : 'transparent',
              shadowColor: pipelineTab === 'completed' ? '#000' : 'transparent',
              shadowOpacity: pipelineTab === 'completed' ? 0.05 : 0,
              shadowRadius: 2,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: pipelineTab === 'completed' ? '700' : '500',
                color: pipelineTab === 'completed' ? '#059669' : '#64748B',
              }}
            >
              Completed ({completedJobs.length})
            </Text>
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {(pipelineTab === 'active' ? activeJobs : completedJobs).map((job) => (
          <Pressable
            key={job.id}
            onPress={() => setSelectedJob(job)}
            style={{
              backgroundColor: '#fff',
              borderRadius: 16,
              borderWidth: 1,
              borderColor: job.status === 'en_route' || job.status === 'in_progress' ? '#059669' : '#E2E8F0',
              padding: 16,
              marginBottom: 12,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748B' }}>{job.orderNumber}</Text>
                  <View
                    style={{
                      backgroundColor:
                        job.status === 'in_progress'
                          ? '#FEF3C7'
                          : job.status === 'en_route'
                          ? '#EFF6FF'
                          : job.status === 'completed'
                          ? '#ECFDF5'
                          : '#F1F5F9',
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: 6,
                      marginLeft: 8,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: '700',
                        color:
                          job.status === 'in_progress'
                            ? '#B45309'
                            : job.status === 'en_route'
                            ? '#2563EB'
                            : job.status === 'completed'
                            ? '#059669'
                            : '#475569',
                      }}
                    >
                      {job.status.replace('_', ' ').toUpperCase()}
                    </Text>
                  </View>
                </View>

                <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A', marginTop: 6 }}>
                  {job.title}
                </Text>
                <Text style={{ fontSize: 13, color: '#475569', marginTop: 2 }}>Customer: {job.customerName}</Text>
              </View>

              <Text style={{ fontSize: 16, fontWeight: '800', color: '#059669' }}>₹{job.amount}</Text>
            </View>

            <View style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center' }}>
              <MapPin size={13} color="#64748B" />
              <Text style={{ fontSize: 12, color: '#64748B', marginLeft: 4 }} numberOfLines={1}>
                {job.address}
              </Text>
            </View>

            <View style={{ marginTop: 4, flexDirection: 'row', alignItems: 'center' }}>
              <Clock size={13} color="#64748B" />
              <Text style={{ fontSize: 12, color: '#64748B', marginLeft: 4 }}>{job.scheduledTime}</Text>
            </View>

            {/* Quick action button */}
            <View style={{ marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#059669' }}>Open Command Center</Text>
              <ChevronRight size={16} color="#059669" />
            </View>
          </Pressable>
        ))}
      </ScrollView>

      {/* Screen 12, 21, 22: Job Command Center Modal */}
      {selectedJob && (
        <Modal visible animationType="slide" transparent>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
            <View
              style={{
                backgroundColor: '#fff',
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                padding: 20,
                maxHeight: '92%',
              }}
            >
              {/* Header */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <View>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748B' }}>
                    JOB COMMAND CENTER · {selectedJob.orderNumber}
                  </Text>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: '#0F172A', marginTop: 2 }}>
                    {selectedJob.title}
                  </Text>
                </View>
                <Pressable onPress={() => setSelectedJob(null)} hitSlop={10}>
                  <X size={22} color="#64748B" />
                </Pressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Customer card */}
                <View style={{ backgroundColor: '#F8FAFC', borderRadius: 14, padding: 14, marginBottom: 14 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A' }}>
                        {selectedJob.customerName}
                      </Text>
                      <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{selectedJob.customerPhone}</Text>
                    </View>
                    <Pressable
                      onPress={() => Linking.openURL(`tel:${selectedJob.customerPhone}`)}
                      style={{
                        backgroundColor: '#ECFDF5',
                        borderColor: '#A7F3D0',
                        borderWidth: 1,
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 20,
                        flexDirection: 'row',
                        alignItems: 'center',
                      }}
                    >
                      <Phone size={14} color="#059669" />
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#059669', marginLeft: 4 }}>Call</Text>
                    </Pressable>
                  </View>

                  <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#E2E8F0' }}>
                    <Text style={{ fontSize: 12, color: '#334155' }}>📍 {selectedJob.address}</Text>
                    {selectedJob.gateCode && (
                      <Text style={{ fontSize: 12, fontWeight: '600', color: '#D97706', marginTop: 4 }}>
                        🔑 Gate Access Code: {selectedJob.gateCode}
                      </Text>
                    )}
                  </View>
                </View>

                {/* Status Stepper Progression */}
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A', marginBottom: 8 }}>
                  Job Status Progression
                </Text>
                <View style={{ flexDirection: 'row', gap: 6, marginBottom: 14 }}>
                  {[
                    { key: 'en_route', label: '1. En Route' },
                    { key: 'arrived', label: '2. Arrived' },
                    { key: 'in_progress', label: '3. Working' },
                    { key: 'completed', label: '4. Done' },
                  ].map((st) => (
                    <Pressable
                      key={st.key}
                      onPress={() => advanceJobStatus(selectedJob.id, st.key as JobStatus)}
                      style={{
                        flex: 1,
                        backgroundColor: selectedJob.status === st.key ? '#059669' : '#F1F5F9',
                        paddingVertical: 8,
                        borderRadius: 8,
                        alignItems: 'center',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: '700',
                          color: selectedJob.status === st.key ? '#fff' : '#475569',
                        }}
                      >
                        {st.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {/* Screen 21: On-Site Checklist & Photo Proof */}
                <View
                  style={{
                    backgroundColor: '#fff',
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                    padding: 14,
                    marginBottom: 14,
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A', marginBottom: 10 }}>
                    On-Site Verification & Photo Proof
                  </Text>

                  {[
                    { key: 'siteSafetyChecked', label: 'Site inspected & main shutoff verified' },
                    { key: 'beforePhotoTaken', label: 'Before-work photo captured & stored' },
                    { key: 'workCompleted', label: 'Repair executed according to proposal' },
                    { key: 'afterPhotoTaken', label: 'After-work completion photo captured' },
                    { key: 'customerSignatureObtained', label: 'Customer verbal or digital sign-off' },
                  ].map((item) => {
                    const isChecked = (checklist as any)[item.key];
                    return (
                      <Pressable
                        key={item.key}
                        onPress={() =>
                          setChecklist((prev) => ({ ...prev, [item.key]: !isChecked }))
                        }
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingVertical: 6,
                        }}
                      >
                        <View
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: 6,
                            backgroundColor: isChecked ? '#059669' : '#F1F5F9',
                            borderWidth: 1,
                            borderColor: isChecked ? '#059669' : '#CBD5E1',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: 10,
                          }}
                        >
                          {isChecked && <CheckCircle2 size={14} color="#fff" />}
                        </View>
                        <Text style={{ fontSize: 12, color: '#334155', flex: 1 }}>{item.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Complete & Bill Button */}
                <Pressable
                  onPress={() => handleCompleteJob(selectedJob.id)}
                  style={{
                    backgroundColor: '#059669',
                    paddingVertical: 14,
                    borderRadius: 12,
                    alignItems: 'center',
                    flexDirection: 'row',
                    justifyContent: 'center',
                    marginBottom: 12,
                  }}
                >
                  <FileCheck size={18} color="#fff" />
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff', marginLeft: 8 }}>
                    Sign Off & Trigger Payout (₹{selectedJob.amount})
                  </Text>
                </Pressable>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}
