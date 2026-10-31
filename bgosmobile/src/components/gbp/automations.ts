import { useCallback, useEffect, useState } from 'react';
import { loadJson, saveJson } from '../../lib/device-storage';
import { apiRequest } from '../../lib/api';
import type { BgosWorkspace } from '../../../../shared/bgos-contracts';

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
      // 1. Instant local restore
      const saved = await loadJson<GbpAutomations>(KEY);
      if (active && saved) {
        setSettings({ ...AUTOMATION_DEFAULTS, ...saved });
      }

      // 2. Fetch authoritative workspace settings from server
      try {
        const ws = await apiRequest<BgosWorkspace>('/api/bgos/workspace');
        if (active && ws?.automations?.gbp) {
          const remoteGbp = ws.automations.gbp as unknown as Partial<GbpAutomations>;
          setSettings((prev) => {
            const merged = { ...prev, ...remoteGbp };
            void saveJson(KEY, merged);
            return merged;
          });
        }
      } catch {}

      if (active) setLoaded(true);
    })();
    return () => {
      active = false;
    };
  }, []);

  const toggle = useCallback((key: AutomationKey, value: boolean) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      void saveJson(KEY, next);
      // Persist to server workspace settings
      void apiRequest('/api/bgos/workspace', {
        method: 'PATCH',
        body: { gbpAutomations: { [key]: value } },
      }).catch(() => {});
      return next;
    });
  }, []);

  return { settings, loaded, toggle };
}
