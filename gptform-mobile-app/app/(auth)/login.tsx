import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Sparkles, Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react-native';
import { useAuthStore } from '@/stores/auth-store';
import { hapticFeedback } from '@/lib/haptics';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, error, clearError } = useAuthStore();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) return;
    await hapticFeedback.light();
    await login(email.trim(), password);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-slate-950"
    >
      <ScrollView contentContainerClassName="flex-grow justify-center px-6 py-12">
        {/* Glow ambient background effect */}
        <View className="items-center mb-8">
          <View className="size-16 rounded-3xl bg-emerald-500/20 border border-emerald-500/40 items-center justify-center shadow-lg shadow-emerald-500/20 mb-4">
            <Sparkles size={32} color="#10B981" />
          </View>
          <Text className="text-3xl font-black text-white tracking-tight">
            GPT<Text className="text-emerald-400">Form</Text>
          </Text>
          <Text className="text-xs text-slate-400 mt-1.5 text-center font-medium">
            Never miss a customer, lead, or booking
          </Text>
        </View>

        {/* Card Container */}
        <View className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl">
          <Text className="text-lg font-bold text-white mb-1">Subscriber Sign In</Text>
          <Text className="text-xs text-slate-400 mb-6">
            Enter your credentials to manage your forms, chats, and leads on the go.
          </Text>

          {error && (
            <View className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 mb-4">
              <Text className="text-xs text-red-400 font-semibold">{error}</Text>
            </View>
          )}

          {/* Email input */}
          <View className="mb-4">
            <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Email Address
            </Text>
            <View className="flex-row items-center bg-slate-950 border border-slate-800 rounded-2xl px-3.5 h-12">
              <Mail size={18} color="#64748B" />
              <TextInput
                value={email}
                onChangeText={(t) => {
                  clearError();
                  setEmail(t);
                }}
                placeholder="you@company.com"
                placeholderTextColor="#475569"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                className="flex-1 text-sm text-white ml-2.5 font-medium"
              />
            </View>
          </View>

          {/* Password input */}
          <View className="mb-6">
            <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Password
            </Text>
            <View className="flex-row items-center bg-slate-950 border border-slate-800 rounded-2xl px-3.5 h-12">
              <Lock size={18} color="#64748B" />
              <TextInput
                value={password}
                onChangeText={(t) => {
                  clearError();
                  setPassword(t);
                }}
                placeholder="••••••••"
                placeholderTextColor="#475569"
                secureTextEntry
                className="flex-1 text-sm text-white ml-2.5 font-medium"
              />
            </View>
          </View>

          {/* Submit button */}
          <TouchableOpacity
            onPress={handleLogin}
            disabled={isLoading || !email || !password}
            activeOpacity={0.8}
            className={`h-12 rounded-2xl items-center justify-center flex-row gap-2 shadow-lg shadow-emerald-600/30 ${
              isLoading || !email || !password
                ? 'bg-emerald-600/50'
                : 'bg-emerald-500 active:bg-emerald-600'
            }`}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Text className="text-sm font-bold text-slate-950">Sign In to GPTForm</Text>
                <ArrowRight size={16} color="#022C22" />
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Security badge */}
        <View className="flex-row items-center justify-center gap-1.5 mt-8">
          <ShieldCheck size={14} color="#64748B" />
          <Text className="text-[11px] text-slate-500 font-medium">
            256-bit encrypted session · Shared with web Studio
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
