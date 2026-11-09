import React from 'react';

export function useSafeAreaInsets() {
  return { top: 0, bottom: 0, left: 0, right: 0 };
}

export function useSafeAreaFrame() {
  return { x: 0, y: 0, width: 390, height: 844 };
}

export const SafeAreaProvider = ({ children }: { children?: React.ReactNode }) =>
  React.createElement(React.Fragment, null, children);

export const SafeAreaView = (props: any) => React.createElement('div', props);

export const initialWindowMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, bottom: 0, left: 0, right: 0 },
};

const safeAreaMock = {
  useSafeAreaInsets,
  useSafeAreaFrame,
  SafeAreaProvider,
  SafeAreaView,
  initialWindowMetrics,
};

export default safeAreaMock;
