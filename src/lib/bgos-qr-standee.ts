export interface StandeeTemplate {
  id: string;
  name: string;
  themeColor: string;
  accentColor: string;
  bgColor: string;
  textColor: string;
  cardBorder: string;
}

export const TEMPLATES: Record<string, StandeeTemplate> = {
  google_grexa_standee: {
    id: 'google_grexa_standee',
    name: 'Google Official Wave (With Logo)',
    themeColor: '#1A73E8',
    accentColor: '#EA4335',
    bgColor: '#FFFFFF',
    textColor: '#0F172A',
    cardBorder: '#E2E8F0',
  },
  google_verified: {
    id: 'google_verified',
    name: 'Google Verified Blue',
    themeColor: '#1A73E8',
    accentColor: '#EA4335',
    bgColor: '#FFFFFF',
    textColor: '#202124',
    cardBorder: '#DADCE0',
  },
  minimalist_black: {
    id: 'minimalist_black',
    name: 'Classic Minimalist',
    themeColor: '#0F172A',
    accentColor: '#334155',
    bgColor: '#FFFFFF',
    textColor: '#0F172A',
    cardBorder: '#E2E8F0',
  },
  warm_gold: {
    id: 'warm_gold',
    name: 'Hospitality Gold',
    themeColor: '#B45309',
    accentColor: '#D97706',
    bgColor: '#FFFDF9',
    textColor: '#78350F',
    cardBorder: '#FDE68A',
  },
  modern_emerald: {
    id: 'modern_emerald',
    name: 'Modern Emerald',
    themeColor: '#059669',
    accentColor: '#10B981',
    bgColor: '#F0FDF4',
    textColor: '#064E3B',
    cardBorder: '#A7F3D0',
  },
};
