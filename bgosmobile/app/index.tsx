import React from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../src/stores/auth-store';
export default function Index() {
  const { isAuthenticated: authenticated, isLoading, onboardingRequired } = useAuthStore(); const router = useRouter();
  if (isLoading) return <SafeAreaView style={styles.screen}><ActivityIndicator accessibilityLabel="Checking your session" color="#FFF" style={{ flex: 1 }} /></SafeAreaView>;
  if (authenticated) return <Redirect href={onboardingRequired ? "/setup" : "/(tabs)"} />;
  return <SafeAreaView style={styles.screen}><StatusBar style="light" /><View style={styles.content}><Image source={require('../assets/app-icon.png')} style={styles.icon} accessibilityLabel="BGOS logo" /><Text style={styles.name}>BGOS</Text><Text style={styles.subtitle}>Business Growth OS</Text><Text style={styles.title}>Get found. Get customers.{ '\n' }Grow your business.</Text><Text style={styles.description}>Conversations, leads, appointments and marketing. Together in your pocket.</Text></View><Pressable accessibilityRole="button" onPress={() => router.push('/login')} style={styles.button}><Text style={styles.buttonText}>Get started</Text></Pressable><Pressable accessibilityRole="button" onPress={() => router.push('/login')} style={styles.secondary}><Text style={styles.subtitle}>Sign in to your account</Text></Pressable></SafeAreaView>;
}
const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: '#4121C9', padding: 28 }, content: { flex: 1, justifyContent: 'center', alignItems: 'center' }, icon: { width: 130, height: 130, borderRadius: 30, marginBottom: 20 }, name: { fontSize: 43, fontWeight: '800', color: '#FFF', letterSpacing: -1 }, subtitle: { fontSize: 15, color: '#E4DCFF', textAlign: 'center' }, title: { fontSize: 27, lineHeight: 36, fontWeight: '700', color: '#FFF', textAlign: 'center', marginTop: 32 }, description: { fontSize: 15, lineHeight: 24, color: '#E4DCFF', textAlign: 'center', marginTop: 18, maxWidth: 320 }, button: { minHeight: 52, backgroundColor: '#FFF', borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, buttonText: { color: '#4121C9', fontSize: 16, fontWeight: '700' }, secondary: { minHeight: 52, alignItems: 'center', justifyContent: 'center', marginTop: 10 } });
