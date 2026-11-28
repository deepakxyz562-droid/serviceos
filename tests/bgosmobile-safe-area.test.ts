import { afterEach, describe, expect, it, vi } from 'vitest';

async function loadSafeAreaForPlatform(os: 'ios' | 'android', statusBarCurrentHeight?: number) {
  vi.resetModules();
  vi.doMock('react-native', () => ({
    Platform: { OS: os },
    StatusBar: { currentHeight: statusBarCurrentHeight },
  }));
  return import('../bgosmobile/src/lib/safe-area');
}

describe('bgosmobile safe-area helpers', () => {
  afterEach(() => {
    vi.doUnmock('react-native');
  });

  it('keeps full 60dp tab-bar content area above Android 3-button, gesture, and zero-inset navigation bars', async () => {
    const { resolveTabBarLayout } = await loadSafeAreaForPlatform('android', 36);

    expect(resolveTabBarLayout(48)).toEqual({
      height: 108,
      paddingBottom: 48,
      paddingTop: 6,
    });
    expect(resolveTabBarLayout(24)).toEqual({
      height: 84,
      paddingBottom: 24,
      paddingTop: 6,
    });
    expect(resolveTabBarLayout(0)).toEqual({
      height: 70,
      paddingBottom: 10,
      paddingTop: 6,
    });
  });

  it('resolves iOS tab-bar layout for notched and home-button devices', async () => {
    const { resolveTabBarLayout } = await loadSafeAreaForPlatform('ios');

    expect(resolveTabBarLayout(34)).toEqual({
      height: 94,
      paddingBottom: 34,
      paddingTop: 6,
    });
    expect(resolveTabBarLayout(0)).toEqual({
      height: 68,
      paddingBottom: 8,
      paddingTop: 6,
    });
  });

  it('prevents top headers from slipping under Android status bar or cutouts when insets.top is 0', async () => {
    const androidWithBar = await loadSafeAreaForPlatform('android', 38);
    expect(androidWithBar.resolveSafeTopInset(0)).toBe(38);
    expect(androidWithBar.resolveSafeTopInset(46)).toBe(46);
    expect(androidWithBar.resolveSafeTopInset(0, 8)).toBe(46);

    const androidModalZeroBar = await loadSafeAreaForPlatform('android', 0);
    expect(androidModalZeroBar.resolveSafeTopInset(0)).toBe(28);

    const ios = await loadSafeAreaForPlatform('ios');
    expect(ios.resolveSafeTopInset(59)).toBe(59);
    expect(ios.resolveSafeTopInset(20, 6)).toBe(26);
  });

  it('enforces minimum bottom clearance via resolveSafeBottomInset', async () => {
    const { resolveSafeBottomInset } = await loadSafeAreaForPlatform('android', 24);
    expect(resolveSafeBottomInset(48, 12)).toBe(48);
    expect(resolveSafeBottomInset(0, 12)).toBe(12);
    expect(resolveSafeBottomInset(-4, 16)).toBe(16);
  });
});
