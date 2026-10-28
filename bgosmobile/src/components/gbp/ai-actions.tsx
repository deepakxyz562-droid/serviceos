import React from 'react';
import { Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../ui';
import { Empty, Card } from '../ui';
import { gbpColors, relativeDate } from './bits';
import type { AiAction } from './types';

/**
 * "AI Actions" feed — merged, date-sorted trail of everything the AI published:
 * posts, photos and review replies. Max 5 rows, newest first.
 */
export function AiActionsFeed({ actions, onOpenPosts }: { actions: AiAction[]; onOpenPosts?: () => void }) {
  if (!actions.length) {
    return (
      <Empty
        title="No AI actions yet"
        detail="Publish your first AI post, photo or review reply and the activity trail will appear here."
        actionLabel={onOpenPosts ? 'Create a post with AI' : undefined}
        onAction={onOpenPosts}
      />
    );
  }

  const meta: Record<AiAction['kind'], { label: string; bg: string; border: string; color: string; icon: React.ComponentProps<typeof MaterialIcons>['name'] }> = {
    post: { label: 'New Post Published', bg: '#FFFFFF', border: gbpColors.ai, color: gbpColors.aiDark, icon: 'article' },
    photo: { label: 'Photo Published', bg: '#FFFFFF', border: gbpColors.emerald, color: '#047857', icon: 'photo' },
    reply: { label: 'Reply Sent', bg: '#FFFFFF', border: gbpColors.emerald, color: '#047857', icon: 'chat-bubble' },
  };

  return (
    <Card style={{ gap: 0, paddingVertical: 4 }}>
      {actions.map((action, i) => {
        const m = meta[action.kind];
        return (
          <View
            key={action.id}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              paddingVertical: 11,
              paddingHorizontal: 12,
              borderTopWidth: i === 0 ? 0 : 1,
              borderTopColor: colors.line,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                backgroundColor: m.bg,
                borderWidth: 1,
                borderColor: m.border,
                borderRadius: 8,
                paddingHorizontal: 7,
                paddingVertical: 3,
              }}
            >
              <MaterialIcons name={m.icon} size={11} color={m.color} />
              <Text style={{ fontSize: 10, fontWeight: '800', color: m.color }}>{m.label}</Text>
            </View>
            <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: colors.ink }} numberOfLines={1}>
              {action.title}
            </Text>
            <Text style={{ fontSize: 11, color: colors.muted }}>{relativeDate(action.when)}</Text>
          </View>
        );
      })}
    </Card>
  );
}
