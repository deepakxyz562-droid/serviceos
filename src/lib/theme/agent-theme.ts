/**
 * Canonical Theme System for Fieseros AI Experiences
 *
 * Normalizes visual styles across:
 * 1. FormAgentStudio (website backdrop preview)
 * 2. AgentDeviceSimulator (chat interface)
 * 3. Public Standalone Chat (/chat/[agentId])
 * 4. Embedded Web Widget
 */

import { FormAgentData } from '@/features/forms/types/agent-types';

export interface AgentTheme {
  primaryColor: string;
  chatBg: string;
  isDark: boolean;
  titleColor: string;
  pageBackgroundStart: string;
  pageBackgroundEnd: string;
  pageBackgroundGradient: string;
  headerBackgroundStart: string;
  headerBackgroundEnd: string;
  headerGradient: string;
  isHeaderDark: boolean;
  borderRadius: 'sm' | 'md' | 'lg' | 'full';
  fontFamily: string;
}

/**
 * Accurately determines if a hex/rgb color is dark using standard luminance formula.
 */
export function isColorDark(color?: string): boolean {
  if (!color) return false;
  let r = 0, g = 0, b = 0;

  if (color.startsWith('#')) {
    const hex = color.replace('#', '');
    if (hex.length === 3) {
      r = parseInt(hex[0] + hex[0], 16);
      g = parseInt(hex[1] + hex[1], 16);
      b = parseInt(hex[2] + hex[2], 16);
    } else if (hex.length >= 6) {
      r = parseInt(hex.substring(0, 2), 16);
      g = parseInt(hex.substring(2, 4), 16);
      b = parseInt(hex.substring(4, 6), 16);
    }
  } else if (color.startsWith('rgb')) {
    const parts = color.match(/\d+/g);
    if (parts && parts.length >= 3) {
      r = parseInt(parts[0], 10);
      g = parseInt(parts[1], 10);
      b = parseInt(parts[2], 10);
    }
  }

  // W3C Perceived Brightness formula
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness < 140;
}

/**
 * Resolves a normalized AgentTheme contract from any FormAgentData instance.
 */
export function resolveAgentTheme(agent?: Partial<FormAgentData> | null): AgentTheme {
  const brandColor = agent?.brandColor || '#0284c7';
  const chatBg = agent?.style?.chatBg || '#ffffff';
  const isDark = (agent?.style as any)?.isDark ?? isColorDark(chatBg);
  const titleColor = agent?.style?.titleColor || (isDark ? '#ffffff' : '#0A1551');

  const pageBackgroundStart = agent?.style?.pageBackgroundStart || '#F1F5F9';
  const pageBackgroundEnd = agent?.style?.pageBackgroundEnd || '#E2E8F0';
  const pageBackgroundGradient = `linear-gradient(135deg, ${pageBackgroundStart}, ${pageBackgroundEnd})`;

  const headerBackgroundStart = agent?.style?.agentBackgroundStart || brandColor;
  const headerBackgroundEnd = agent?.style?.agentBackgroundEnd || brandColor;
  const headerGradient = `linear-gradient(135deg, ${headerBackgroundStart}, ${headerBackgroundEnd})`;
  const isHeaderDark = isColorDark(headerBackgroundStart);

  return {
    primaryColor: brandColor,
    chatBg,
    isDark,
    titleColor,
    pageBackgroundStart,
    pageBackgroundEnd,
    pageBackgroundGradient,
    headerBackgroundStart,
    headerBackgroundEnd,
    headerGradient,
    isHeaderDark,
    borderRadius: agent?.style?.borderRadius || 'lg',
    fontFamily: agent?.style?.fontFamily || 'Inter',
  };
}
