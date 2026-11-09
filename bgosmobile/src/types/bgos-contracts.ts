export interface BgosWorkspace {
  name: string;
  mode: 'local' | 'agency';
  locale?: {
    country: string;
    countryName: string;
    callingCode: string;
    timeZone: string;
    locale: string;
  };
  links: { profile: string | null; booking: string | null; form: string | null; review: string | null };
  automations: { profileAssistant: boolean; offlineReply: boolean; gbp?: Record<string, boolean> };
  bookingPageConfig?: {
    businessName?: string;
    phone?: string;
    whatsapp?: string;
    email?: string;
    website?: string;
    headline?: string;
    seoDescription?: string;
    onlineBookingEnabled?: boolean;
  };
  intakeForm?: { id: string; name: string; slug: string } | null;
  plan: { code: string; status: string };
  billing?: {
    region: 'india' | 'international';
    currency: 'INR' | 'USD';
    countryCode: string;
    startingPriceLabel: string;
  };
  usage?: { contacts: number; forms: number; usedLeadCredits: number; leadCreditLimit: number };
}
export interface BgosConversation {
  id: string; customerName: string; channel: string; lastMessage: string;
  lastMessageTime: string; unreadCount: number; aiPaused: boolean; status: string;
}
export interface BgosMessage {
  id: string; content: string; sender: 'customer' | 'agent' | 'system'; timestamp: string;
  delivery?: { status: string; reason?: string; error?: string };
}
