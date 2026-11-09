import React from 'react';

export const Platform = {
  OS: 'ios' as const,
  select: <T>(objs: { ios?: T; android?: T; default?: T }) => objs.ios ?? objs.default,
};

export const Dimensions = {
  get: () => ({ width: 390, height: 844, scale: 2, fontScale: 1 }),
  addEventListener: () => ({ remove: () => {} }),
};

export function useWindowDimensions() {
  return { width: 390, height: 844, scale: 2, fontScale: 1 };
}

export const StatusBar = (props: any) => React.createElement('div', props);

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

function flattenStyle(style: any): Record<string, any> | undefined {
  if (!style) return undefined;
  if (Array.isArray(style)) {
    const merged: Record<string, any> = {};
    for (const item of style) {
      const part = flattenStyle(item);
      if (part) Object.assign(merged, part);
    }
    return merged;
  }
  return typeof style === 'object' ? style : undefined;
}

function toDomProps(props: any, isPressable = false) {
  if (!props) return {};
  const {
    style,
    contentContainerStyle: _ccs,
    showsVerticalScrollIndicator: _svsi,
    showsHorizontalScrollIndicator: _shsi,
    onPress,
    onChangeText,
    accessibilityLabel,
    accessibilityRole: _role,
    hitSlop: _hs,
    activeOpacity: _ao,
    numberOfLines: _nol,
    horizontal: _horiz,
    pointerEvents: _pe,
    placeholderTextColor: _ptc,
    behavior: _beh,
    resizeMode: _rm,
    onLoadStart: _ols,
    onLoadEnd: _ole,
    source,
    ...rest
  } = props;
  const next: Record<string, any> = { ...rest };
  if (accessibilityLabel !== undefined) {
    next['aria-label'] = accessibilityLabel;
  }
  if (source && typeof source === 'object' && typeof source.uri === 'string' && !next.src) {
    next.src = source.uri;
  }
  if (typeof onChangeText === 'function' && !next.onChange) {
    next.onChange = (e: any) => onChangeText(e?.target?.value ?? '');
  }
  const flat = flattenStyle(style);
  if (flat) next.style = flat;
  if (isPressable && typeof onPress === 'function' && !next.onClick) {
    next.onClick = onPress;
  }
  return next;
}

export const View = (props: any) => React.createElement('div', toDomProps(props));
export const Text = (props: any) => React.createElement('span', toDomProps(props));
export const Pressable = (props: any) => React.createElement('button', toDomProps(props, true));
export const ScrollView = (props: any) => React.createElement('div', toDomProps(props));
export const Image = (props: any) => React.createElement('img', toDomProps(props));
export const Modal = (props: any) => React.createElement('div', toDomProps(props));
export const KeyboardAvoidingView = (props: any) => React.createElement('div', toDomProps(props));
export const ActivityIndicator = (props: any) => React.createElement('div', toDomProps(props));
export const TextInput = (props: any) => React.createElement('input', toDomProps(props));
export const PanResponder = {
  create: () => ({ panHandlers: {} }),
};

const reactNativeMock = {
  Platform,
  Dimensions,
  useWindowDimensions,
  StatusBar,
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
  KeyboardAvoidingView,
  ActivityIndicator,
  TextInput,
  PanResponder,
};

export default reactNativeMock;
