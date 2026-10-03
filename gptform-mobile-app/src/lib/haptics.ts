import { Platform } from 'react-native';

let HapticsModule: any = null;
try {
  HapticsModule = require('expo-haptics');
} catch {}

export const hapticFeedback = {
  light: async () => {
    if (Platform.OS === 'web' || !HapticsModule) return;
    try {
      await HapticsModule.impactAsync(HapticsModule.ImpactFeedbackStyle?.Light);
    } catch {}
  },
  medium: async () => {
    if (Platform.OS === 'web' || !HapticsModule) return;
    try {
      await HapticsModule.impactAsync(HapticsModule.ImpactFeedbackStyle?.Medium);
    } catch {}
  },
  heavy: async () => {
    if (Platform.OS === 'web' || !HapticsModule) return;
    try {
      await HapticsModule.impactAsync(HapticsModule.ImpactFeedbackStyle?.Heavy);
    } catch {}
  },
  success: async () => {
    if (Platform.OS === 'web' || !HapticsModule) return;
    try {
      await HapticsModule.notificationAsync(HapticsModule.NotificationFeedbackType?.Success);
    } catch {}
  },
  warning: async () => {
    if (Platform.OS === 'web' || !HapticsModule) return;
    try {
      await HapticsModule.notificationAsync(HapticsModule.NotificationFeedbackType?.Warning);
    } catch {}
  },
  error: async () => {
    if (Platform.OS === 'web' || !HapticsModule) return;
    try {
      await HapticsModule.notificationAsync(HapticsModule.NotificationFeedbackType?.Error);
    } catch {}
  },
};
