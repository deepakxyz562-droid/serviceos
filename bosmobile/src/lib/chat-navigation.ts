import { Alert } from 'react-native';
import { router } from 'expo-router';
import { apiRequest } from '@/lib/api';
import { API_PATHS } from '@/lib/constants';

/**
 * Honest "Test in Chat" navigation.
 *
 * Opens the tenant's most recent REAL chat session by fetching
 * GET /api/chat/sessions (ordered by lastMessageAt DESC) and navigating to
 * `/chat/{id}`. When the tenant has no conversations yet, we say so instead of
 * routing to a session that cannot exist.
 */
export async function openLatestChatSession(): Promise<void> {
  try {
    const res = await apiRequest<{ sessions?: Array<{ id: string }> }>(API_PATHS.sessions, {
      params: { status: 'all' },
    });
    const latest = Array.isArray(res?.sessions) ? res.sessions[0] : undefined;
    if (latest?.id) {
      router.push(`/chat/${latest.id}` as any);
      return;
    }
    Alert.alert(
      'No conversations yet',
      'No conversations yet — chat sessions appear here once customers message you.'
    );
  } catch (err: any) {
    Alert.alert(
      'Chat unavailable',
      err?.message || 'Could not load your chat sessions. Please try again.'
    );
  }
}
