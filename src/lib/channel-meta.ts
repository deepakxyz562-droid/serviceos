/**
 * Channel Metadata Registry
 * --------------------------
 * Centralized source of truth for all omnichannel channels. Every UI component
 * (channels-view, omnichannel-view, channel-wizard) and every API route reads
 * from this registry. Do NOT hardcode channel lists elsewhere.
 *
 * 10 channels across 3 tiers:
 *   - one_click: We host it. User just toggles on + copies embed code.
 *   - oauth:     "Connect with X" button. Superadmin registers the OAuth app.
 *   - manual:    User copies API keys from provider dashboard (guided wizard).
 */

import {
  MessageSquare,
  Send,
  Instagram,
  MessageCircle,
  Mail,
  MessagesSquare,
  Layout,
  Building2,
  Users,
  Hash,
  type LucideIcon,
} from 'lucide-react'

export type ChannelTier = 'one_click' | 'oauth' | 'manual'
export type ChannelTypeCategory = 'messaging' | 'email' | 'web'

export interface ChannelMeta {
  id: string
  label: string
  description: string
  icon: LucideIcon
  /** Brand-accurate hex color for badges / icons */
  color: string
  /** Tailwind classes derived from the brand color */
  badgeClass: string
  iconClass: string
  tier: ChannelTier
  category: ChannelTypeCategory
  /** OAuth provider key (only for tier=oauth) */
  oauthProvider?: string
  /** Whether this channel is live in the inbox filter bar */
  showInInbox: boolean
  /** Response-time expectation shown in guidance */
  responseExpectation: string
  /** Market relevance note shown in guidance */
  marketNote: string
}

export const CHANNELS: ChannelMeta[] = [
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    description: 'WhatsApp Business Cloud API — most-used messaging channel in EU/APAC/MEA markets.',
    icon: MessageSquare,
    color: '#25D366',
    badgeClass: 'bg-[#25D366]/10 text-[#25D366] border-[#25D366]/30',
    iconClass: 'text-[#25D366]',
    tier: 'oauth',
    category: 'messaging',
    oauthProvider: 'whatsapp',
    showInInbox: true,
    responseExpectation: 'Customers expect replies within minutes during business hours.',
    marketNote: 'Dominant in India, Brazil, UK, Germany, France, Middle East. Essential for field-service businesses.',
  },
  {
    id: 'messenger',
    label: 'Facebook Messenger',
    description: 'Facebook Page messaging via Meta Graph API.',
    icon: Send,
    color: '#0084FF',
    badgeClass: 'bg-[#0084FF]/10 text-[#0084FF] border-[#0084FF]/30',
    iconClass: 'text-[#0084FF]',
    tier: 'oauth',
    category: 'messaging',
    oauthProvider: 'messenger',
    showInInbox: true,
    responseExpectation: 'Meta expects responses within 24 hours (policy requirement).',
    marketNote: 'Strong in North America & UK consumer markets. Good for B2C service businesses.',
  },
  {
    id: 'instagram',
    label: 'Instagram',
    description: 'Instagram Direct Messages via Meta Graph API.',
    icon: Instagram,
    color: '#E4405F',
    badgeClass: 'bg-[#E4405F]/10 text-[#E4405F] border-[#E4405F]/30',
    iconClass: 'text-[#E4405F]',
    tier: 'oauth',
    category: 'messaging',
    oauthProvider: 'instagram',
    showInInbox: true,
    responseExpectation: 'Meta expects responses within 7 days. Fast replies boost engagement.',
    marketNote: 'Critical for beauty, fitness, home services, and visual-service businesses.',
  },
  {
    id: 'sms',
    label: 'SMS',
    description: 'Transactional SMS via Twilio, Vonage, MSG91, Plivo, TextLocal, or Exotel.',
    icon: MessageCircle,
    color: '#6B7280',
    badgeClass: 'bg-gray-100 text-gray-700 border-gray-300',
    iconClass: 'text-gray-600',
    tier: 'manual',
    category: 'messaging',
    showInInbox: true,
    responseExpectation: 'Customers expect replies within hours. STOP keyword must be honored.',
    marketNote: 'Universal reach. Required for appointment reminders & 2FA. Bulk marketing SMS restricted.',
  },
  {
    id: 'email',
    label: 'Email',
    description: 'Transactional email (included). Marketing email requires your own ESP.',
    icon: Mail,
    color: '#EA4335',
    badgeClass: 'bg-[#EA4335]/10 text-[#EA4335] border-[#EA4335]/30',
    iconClass: 'text-[#EA4335]',
    tier: 'one_click',
    category: 'email',
    showInInbox: true,
    responseExpectation: 'Customers expect replies within 24 hours. Unsubscribe must be honored.',
    marketNote: 'Universal. The ONLY channel that supports bulk marketing campaigns (GDPR-compliant).',
  },
  {
    id: 'livechat',
    label: 'Live Chat',
    description: 'Embedded chat on your website. We host the server — just paste the snippet.',
    icon: MessagesSquare,
    color: '#10B981',
    badgeClass: 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30',
    iconClass: 'text-[#10B981]',
    tier: 'one_click',
    category: 'web',
    showInInbox: true,
    responseExpectation: 'Visitors expect replies within 2 minutes during business hours.',
    marketNote: 'Highest-conversion inbound channel for service businesses.',
  },
  {
    id: 'webwidget',
    label: 'Web Widget',
    description: 'Floating chat button on your website. We host — just paste the snippet.',
    icon: Layout,
    color: '#3B82F6',
    badgeClass: 'bg-[#3B82F6]/10 text-[#3B82F6] border-[#3B82F6]/30',
    iconClass: 'text-[#3B82F6]',
    tier: 'one_click',
    category: 'web',
    showInInbox: true,
    responseExpectation: 'Visitors expect replies within 5 minutes during business hours.',
    marketNote: 'Less intrusive than full-page live chat. Good default for SMB websites.',
  },
  {
    id: 'googlebusiness',
    label: 'Google Business',
    description: 'Google Business Profile messaging via Google OAuth.',
    icon: Building2,
    color: '#4285F4',
    badgeClass: 'bg-[#4285F4]/10 text-[#4285F4] border-[#4285F4]/30',
    iconClass: 'text-[#4285F4]',
    tier: 'oauth',
    category: 'messaging',
    oauthProvider: 'googlebusiness',
    showInInbox: true,
    responseExpectation: 'Google expects responses within 24 hours.',
    marketNote: 'Critical for local-service businesses (plumbers, electricians, cleaners).',
  },
  {
    id: 'teams',
    label: 'Microsoft Teams',
    description: 'Teams channel messaging via Microsoft Azure AD OAuth.',
    icon: Users,
    color: '#5059C9',
    badgeClass: 'bg-[#5059C9]/10 text-[#5059C9] border-[#5059C9]/30',
    iconClass: 'text-[#5059C9]',
    tier: 'oauth',
    category: 'messaging',
    oauthProvider: 'teams',
    showInInbox: true,
    responseExpectation: 'B2B — replies within business hours.',
    marketNote: 'Enterprise B2B communication. Good for B2B service businesses.',
  },
  {
    id: 'slack',
    label: 'Slack',
    description: 'Slack workspace messaging via Slack OAuth.',
    icon: Hash,
    color: '#611F69',
    badgeClass: 'bg-[#611F69]/10 text-[#611F69] border-[#611F69]/30',
    iconClass: 'text-[#611F69]',
    tier: 'oauth',
    category: 'messaging',
    oauthProvider: 'slack',
    showInInbox: true,
    responseExpectation: 'B2B — replies within business hours.',
    marketNote: 'Tech-savvy B2B teams. Good for SaaS & dev-tool service businesses.',
  },
]

/** Get a channel by ID (returns undefined if not found). */
export function getChannel(id: string): ChannelMeta | undefined {
  return CHANNELS.find((c) => c.id === id)
}

/** Channels shown in the omnichannel inbox filter bar. */
export const INBOX_CHANNELS = CHANNELS.filter((c) => c.showInInbox)

/** Channels grouped by tier for the channels-view grid. */
export const CHANNELS_BY_TIER = {
  one_click: CHANNELS.filter((c) => c.tier === 'one_click'),
  oauth: CHANNELS.filter((c) => c.tier === 'oauth'),
  manual: CHANNELS.filter((c) => c.tier === 'manual'),
}

/** Default channel seeding for the ChannelConfig table (omnichannel/channels API). */
export const DEFAULT_CHANNEL_SEED = CHANNELS.map((c, i) => ({
  channel: c.id,
  name: c.label,
  status: c.tier === 'one_click' ? 'active' : 'inactive', // one-click channels auto-active
  isDefault: c.id === 'email', // email is the default channel
  autoCreateLead: true,
  channelType: c.category,
  tier: c.tier,
  setupCompleted: c.tier === 'one_click', // one-click channels are pre-setup
  setupStep: c.tier === 'one_click' ? 1 : 0,
  sortOrder: i,
}))

/** OAuth provider metadata (used by the connect/callback flow). */
export const OAUTH_PROVIDERS: Record<
  string,
  {
    authUrl: string
    tokenUrl: string
    scopes: string
    displayName: string
    docsUrl: string
  }
> = {
  whatsapp: {
    authUrl: 'https://www.facebook.com/v19.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v19.0/oauth/access_token',
    scopes: 'whatsapp_business_messaging,whatsapp_business_management',
    displayName: 'WhatsApp Cloud API',
    docsUrl: 'https://developers.facebook.com/docs/whatsapp/cloud-api',
  },
  messenger: {
    authUrl: 'https://www.facebook.com/v19.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v19.0/oauth/access_token',
    scopes: 'pages_messaging,pages_show_list,pages_manage_metadata',
    displayName: 'Facebook Messenger',
    docsUrl: 'https://developers.facebook.com/docs/messenger-platform',
  },
  instagram: {
    authUrl: 'https://www.facebook.com/v19.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v19.0/oauth/access_token',
    scopes: 'instagram_basic,instagram_manage_messages,pages_show_list',
    displayName: 'Instagram DM',
    docsUrl: 'https://developers.facebook.com/docs/instagram-platform',
  },
  googlebusiness: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: 'https://www.googleapis.com/auth/business.manage',
    displayName: 'Google Business Profile',
    docsUrl: 'https://developers.google.com/my-business/content/chat-and-messages',
  },
  teams: {
    authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    scopes: 'https://graph.microsoft.com/ChannelMessage.Read.All Channel.ReadBasic.All',
    displayName: 'Microsoft Teams',
    docsUrl: 'https://learn.microsoft.com/graph/api/channel-list-messages',
  },
  slack: {
    authUrl: 'https://slack.com/oauth/v2/authorize',
    tokenUrl: 'https://slack.com/api/oauth.v2.access',
    scopes: 'channels:history,chat:write,im:history,im:read,im:write,team:read',
    displayName: 'Slack',
    docsUrl: 'https://api.slack.com/docs',
  },
}
