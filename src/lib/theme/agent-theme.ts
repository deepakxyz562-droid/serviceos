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

export interface ColorSchemePreset {
  id: string;
  name: string;
  bg: string;
  endBg: string;
  titleColor: string;
  textBg: string;
  letterColor: string;
  isDark: boolean;
}

// 8 Curated Color Schemes (Jotform Parity)
export const COLOR_SCHEMES: ColorSchemePreset[] = [
  { id: 'scheme_1', name: 'Sky White', bg: '#C5E3FA', endBg: '#D6E1E7', titleColor: '#0A1551', textBg: '#FFFFFF', letterColor: '#0284c7', isDark: false },
  { id: 'scheme_2', name: 'Emerald Mint', bg: '#D1FAE5', endBg: '#E0F2FE', titleColor: '#064E3B', textBg: '#FFFFFF', letterColor: '#059669', isDark: false },
  { id: 'scheme_3', name: 'Warm Amber', bg: '#FFEDD5', endBg: '#FEF3C7', titleColor: '#7C2D12', textBg: '#FFFFFF', letterColor: '#EA580C', isDark: false },
  { id: 'scheme_4', name: 'Slate Dark', bg: '#E2E8F0', endBg: '#CBD5E1', titleColor: '#0F172A', textBg: '#334155', letterColor: '#F8FAFC', isDark: true },
  { id: 'scheme_5', name: 'Olive Lime', bg: '#ECFCCB', endBg: '#F7FEE7', titleColor: '#365314', textBg: '#FFFFFF', letterColor: '#65A30D', isDark: false },
  { id: 'scheme_6', name: 'Midnight Blue', bg: '#0F172A', endBg: '#1E293B', titleColor: '#FFFFFF', textBg: '#020617', letterColor: '#60A5FA', isDark: true },
  { id: 'scheme_7', name: 'Magenta Berry', bg: '#FCE7F3', endBg: '#F3E8FF', titleColor: '#831843', textBg: '#831843', letterColor: '#FDF2F8', isDark: true },
  { id: 'scheme_8', name: 'Royal Purple', bg: '#EDE9FE', endBg: '#DDD6FE', titleColor: '#4C1D95', textBg: '#4C1D95', letterColor: '#F5F3FF', isDark: true },
];

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
  const colorSchemeId = agent?.style?.colorSchemeId;
  const matchedScheme = colorSchemeId
    ? COLOR_SCHEMES.find((s) => s.id === colorSchemeId)
    : COLOR_SCHEMES.find((s) => s.letterColor.toLowerCase() === (agent?.brandColor || '').toLowerCase());

  const isDefaultBrandColor = !agent?.brandColor || agent?.brandColor === '#059669' || agent?.brandColor === '#0284c7';
  const brandColor = (matchedScheme && isDefaultBrandColor)
    ? matchedScheme.letterColor
    : (agent?.brandColor || matchedScheme?.letterColor || '#0284c7');
  const chatBg = agent?.style?.chatBg || (matchedScheme ? (matchedScheme.isDark ? '#0f172a' : '#ffffff') : '#ffffff');
  const isDark = (agent?.style as any)?.isDark ?? (matchedScheme ? matchedScheme.isDark : isColorDark(chatBg));
  const titleColor = agent?.style?.titleColor || matchedScheme?.titleColor || (isDark ? '#ffffff' : '#0A1551');

  const pageBackgroundStart = agent?.style?.pageBackgroundStart || matchedScheme?.bg || '#F1F5F9';
  const pageBackgroundEnd = agent?.style?.pageBackgroundEnd || matchedScheme?.endBg || '#E2E8F0';
  const pageBackgroundGradient = `linear-gradient(135deg, ${pageBackgroundStart}, ${pageBackgroundEnd})`;

  const headerBackgroundStart = agent?.style?.agentBackgroundStart || matchedScheme?.bg || brandColor;
  const headerBackgroundEnd = agent?.style?.agentBackgroundEnd || matchedScheme?.endBg || brandColor;
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
