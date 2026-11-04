import React from 'react';

export const Platform = {
  OS: 'ios' as const,
  select: <T>(objs: { ios?: T; android?: T; default?: T }) => objs.ios ?? objs.default,
};

export const Alert = {
  alert: () => {},
};

export const Linking = {
  openURL: async () => {},
  canOpenURL: async () => true,
};

export const AppState = {
  currentState: 'active',
  addEventListener: () => ({ remove: () => {} }),
};

export const StyleSheet = {
  create: <T>(styles: T): T => styles,
  absoluteFill: {},
};

export const Share = {
  share: async () => ({ action: 'sharedAction' }),
};

export const View = (props: any) => React.createElement('div', props);
export const Text = (props: any) => React.createElement('span', props);
export const Pressable = (props: any) => React.createElement('button', props);
export const ScrollView = (props: any) => React.createElement('div', props);
export const Image = (props: any) => React.createElement('img', props);
export const Modal = (props: any) => React.createElement('div', props);
export const ActivityIndicator = (props: any) => React.createElement('div', props);
export const TextInput = (props: any) => React.createElement('input', props);
export const PanResponder = {
  create: () => ({ panHandlers: {} }),
};

export default {
  Platform,
  Alert,
  Linking,
  AppState,
  StyleSheet,
  Share,
  View,
  Text,
  Pressable,
  ScrollView,
  Image,
  Modal,
  ActivityIndicator,
  TextInput,
  PanResponder,
};
