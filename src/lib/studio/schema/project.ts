/**
 * Fieseros Universal Studio - Page & Project Schemas
 */

import { StudioNode } from './node';

export type PageLayoutType = 'standard' | 'blank' | 'canvas' | 'split_hero' | 'focus_flow' | 'app_shell';

export interface StudioPage {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  layoutType: PageLayoutType;
  isHomePage?: boolean;
  requiresAuth?: boolean;
  accessRole?: 'public' | 'client' | 'technician' | 'admin';
  passwordHash?: string;
  meta?: {
    title?: string;
    description?: string;
    ogImage?: string;
    favicon?: string;
  };
  rootNode: StudioNode;
}

export interface StudioGlobalTheme {
  themeMode: 'light' | 'dark' | 'auto';
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  mutedTextColor: string;
  fontFamily: string;
  headingFontFamily: string;
  borderRadius: '0px' | '6px' | '12px' | '16px' | '24px' | '9999px';
  buttonStyle: {
    borderRadius?: string;
    fontSize?: string;
    fontWeight?: string;
    padding?: string;
    shadow?: string;
    textTransform?: 'none' | 'uppercase' | 'capitalize';
  };
  cardStyle: {
    backgroundColor?: string;
    borderRadius?: string;
    borderColor?: string;
    shadow?: string;
  };
  inputStyle: {
    borderRadius?: string;
    borderColor?: string;
    backgroundColor?: string;
    height?: string;
  };
}

export interface StudioPwaConfig {
  enabled: boolean;
  appName: string;
  shortName: string;
  description?: string;
  themeColor: string;
  backgroundColor: string;
  display: 'standalone' | 'fullscreen' | 'minimal-ui';
  startUrl: string;
  iconUrl?: string;
  offlineSupport: boolean;
}

export interface StudioGlobalSymbol {
  id: string;
  name: string;
  node: StudioNode;
  createdAt: string;
  updatedAt: string;
}

export interface StudioProject {
  id: string;
  slug: string;
  name: string;
  description?: string;
  projectType: 'form' | 'agent' | 'app' | 'hybrid';
  industry: string;
  
  // Multi-Page Architecture
  activePageId: string;
  pages: StudioPage[];
  
  // Global Design System
  globalTheme: StudioGlobalTheme;
  globalSymbols: StudioGlobalSymbol[];
  
  // PWA Shell Configuration
  pwa: StudioPwaConfig;
  
  // Settings & Integrations
  settings: {
    allowSubmissions: boolean;
    submissionLimit?: number;
    expiresAt?: string;
    redirectUrl?: string;
    successMessage?: string;
    recaptchaEnabled?: boolean;
    gdprConsentRequired?: boolean;
    autoCrmSync: boolean;
    autoJobDispatch: boolean;
    notifyEmails?: string[];
  };
  
  createdAt: string;
  updatedAt: string;
}
