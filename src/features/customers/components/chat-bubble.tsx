'use client';

/**
 * ChatBubble — single message bubble for the Communication tab.
 *
 * Extracted from src/components/views/customer-360-view.tsx (Phase 6B2).
 * Customer bubbles render on the left (muted), outbound bubbles on the
 * right (primary). Avatars are optional and rendered conditionally based
 * on direction.
 *
 * The `message` object is intentionally permissive (`any`) — the 360° API
 * returns either a `conversation` row (with `lastMessageBody`) or an
 * individual message (with `body` / `content`).
 */

import { User, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDateTime } from '../utils/customer-helpers';

interface ChatBubbleProps {
  message: any;
  isCustomer: boolean;
  showAvatar?: boolean;
}

export function ChatBubble({ message, isCustomer, showAvatar = false }: ChatBubbleProps) {
  return (
    <div className={cn('flex gap-2', isCustomer ? 'justify-start' : 'justify-end')}>
      {isCustomer && showAvatar && (
        <div className="size-7 rounded-full bg-emerald-600/20 flex items-center justify-center shrink-0 mt-1">
          <User className="size-3.5 text-emerald-400" />
        </div>
      )}
      <div
        className={cn(
          'max-w-[75%] rounded-2xl px-4 py-2.5 text-sm',
          isCustomer
            ? 'bg-muted text-foreground rounded-bl-md rounded-tl-xl'
            : 'bg-primary text-primary-foreground rounded-br-md rounded-tr-xl'
        )}
      >
        <p>{message.body || message.lastMessageBody || message.content || ''}</p>
        <p className={cn('text-[10px] mt-1', isCustomer ? 'text-muted-foreground' : 'text-primary-foreground/70')}>
          {message.createdAt ? formatDateTime(message.createdAt) : ''}
        </p>
      </div>
      {!isCustomer && showAvatar && (
        <div className="size-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-1">
          <Bot className="size-3.5 text-primary" />
        </div>
      )}
    </div>
  );
}
