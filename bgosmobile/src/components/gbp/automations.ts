import { useCallback, useEffect, useState } from 'react';
import { loadJson, saveJson } from '../../lib/device-storage';

export type AutomationKey = 'replyToReviews' | 'generatePosts' | 'postingSchedule' | 'mediaSchedule';

export type GbpAutomations = Record<AutomationKey, boolean>;

export const AUTOMATION_DEFAULTS: GbpAutomations = {
  replyToReviews: false,
  generatePosts: false,
  postingSchedule: false,
  mediaSchedule: false,
};

const KEY = 'bgos_gbp_automations_v1';

/**
 * Automation toggle state for the "Setup Automations" timeline group.
 * Data-authenticity rule #6: every automation defaults OFF and only changes
 * through an explicit user action. State persists on-device (the workspace
 * settings API does not expose GBP automation flags yet — Task 3-b may move
 * this server-side; the hook shape already matches a future API swap).
 */
export function useGbpAutomations() {
  const [settings, setSettings] = useState<GbpAutomations>(AUTOMATION_DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const saved = await loadJson<GbpAutomations>(KEY);
      if (!active) return;
      if (saved) setSettings({ ...AUTOMATION_DEFAULTS, ...saved });
      setLoaded(true);
    })();
    return () => {
      active = false;
    };
  }, []);

  const toggle = useCallback((key: AutomationKey, value: boolean) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      void saveJson(KEY, next);
      return next;
    });
  }, []);

  return { settings, loaded, toggle };
}
