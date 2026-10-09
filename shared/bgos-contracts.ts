export interface BgosWorkspace {
  name: string;
  mode: 'local' | 'agency';
  links: { profile: string | null; booking: string | null; form: string | null; review: string | null };
  automations: { profileAssistant: boolean; offlineReply: boolean };
  plan: { code: string; status: string };
}
export interface BgosConversation {
  id: string; customerName: string; channel: string; lastMessage: string;
  lastMessageTime: string; unreadCount: number; aiPaused: boolean; status: string;
}
export interface BgosMessage {
  id: string; content: string; sender: 'customer' | 'agent' | 'system'; timestamp: string;
  delivery?: { status: string; reason?: string; error?: string };
}
