import { Platform, StatusBar as RNStatusBar } from 'react-native';

const DEFAULT_ANDROID_TOP_INSET = 28;
const TAB_BAR_CONTENT_HEIGHT = 60;

/**
 * Resolve top safe-area padding reliably across iOS, Android edge-to-edge,
 * display cutouts, and full-screen Modals where useSafeAreaInsets().top can
 * initially report 0 before layout settles.
 */
export function resolveSafeTopInset(insetsTop: number, extraTopPadding = 0): number {
  const safeTop = Number.isFinite(insetsTop) && insetsTop > 0 ? insetsTop : 0;
  if (Platform.OS === 'android') {
    const statusH = RNStatusBar.currentHeight ?? 0;
    const minAndroidTop = statusH > 0 ? statusH : DEFAULT_ANDROID_TOP_INSET;
    return Math.max(safeTop, minAndroidTop) + extraTopPadding;
  }
  return safeTop + extraTopPadding;
}

/**
 * Resolve bottom safe-area inset with a minimum clearance floor for devices
 * using edge-to-edge Android 3-button / gesture navigation or iOS home bars.
 */
export function resolveSafeBottomInset(insetsBottom: number, minFallback = 12): number {
  const safeBottom = Number.isFinite(insetsBottom) && insetsBottom > 0 ? insetsBottom : 0;
  return Math.max(safeBottom, minFallback);
}

/**
 * Compute consistent tab-bar dimensions on iOS & Android edge-to-edge so
 * 3-button Android navigation bars (~48dp) never overlap icons or labels.
 */
export function resolveTabBarLayout(insetsBottom: number): {
  height: number;
  paddingBottom: number;
  paddingTop: number;
} {
  const safeBottom = Number.isFinite(insetsBottom) && insetsBottom > 0 ? insetsBottom : 0;
  const paddingBottom =
    Platform.OS === 'android'
      ? Math.max(safeBottom, 10)
      : safeBottom > 0
        ? safeBottom
        : 8;

  return {
    height: TAB_BAR_CONTENT_HEIGHT + paddingBottom,
    paddingBottom,
    paddingTop: 6,
  };
}
