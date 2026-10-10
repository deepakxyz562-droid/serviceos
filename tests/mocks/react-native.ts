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

export default {
  Platform,
  Alert,
  Linking,
  AppState,
};
