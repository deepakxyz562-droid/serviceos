'use client';

/**
 * CommunicationTab — list of conversation cards with chat bubbles.
 *
 * Extracted from src/components/views/customer-360-view.tsx (Phase 6B2).
 * Each conversation card renders a header (channel + status badges) and a
 * body containing the last message bubble + up to 5 most-recent parsed
 * messages from `messagesJson`.
 *
 * Pure presentational component. The parent owns the `conversations` array
 * (from the customer 360° query) and the `customer360Loading` flag.
 */

import { User, MessageCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatDateTime } from '../../utils/customer-helpers';
import { ChatBubble } from '../chat-bubble';

interface CommunicationTabProps {
  conversations: any[];
  customer360Loading: boolean;
}

export function CommunicationTab({
  conversations,
  customer360Loading,
}: CommunicationTabProps) {
  return (
    <ScrollArea className="h-full max-h-[calc(100vh-16rem)]">
      <div className="p-5 space-y-6">
        {customer360Loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="size-8 rounded-full" />
                <Skeleton className="h-12 w-64 rounded-xl" />
              </div>
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <MessageCircle className="size-10 text-muted-foreground mb-3" />
            <h3 className="text-base font-semibold text-foreground">No conversations</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Conversations from WhatsApp, SMS, and Email will appear here
            </p>
          </div>
        ) : (
          conversations.map((conv: any) => (
            <Card
              key={conv.id}
              className="bg-card border-border rounded-xl overflow-hidden"
            >
              {/* Conversation header */}
              <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-border bg-muted/30">
                <div className="flex items-center gap-2">
                  <div className="size-7 rounded-full bg-emerald-600/20 flex items-center justify-center">
                    <User className="size-3.5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {conv.customerName || conv.customerPhone || 'Conversation'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px] rounded-md',
                      conv.channel === 'whatsapp'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-700'
                        : 'bg-muted text-muted-foreground border-border'
                    )}
                  >
                    {conv.channel || 'chat'}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px] rounded-md',
                      conv.status === 'active'
                        ? 'bg-sky-500/10 text-sky-400 border-sky-800'
                        : 'bg-muted text-muted-foreground border-border'
                    )}
                  >
                    {conv.status}
                  </Badge>
                </div>
              </div>
              {/* Chat area */}
              <CardContent className="p-4 space-y-2.5 bg-background">
                {conv.lastMessageBody && (
                  <ChatBubble
                    message={conv}
                    isCustomer={conv.lastDirection !== 'outbound'}
                    showAvatar
                  />
                )}
                {conv.messagesJson && (() => {
                  try {
                    const msgs = JSON.parse(conv.messagesJson);
                    if (Array.isArray(msgs) && msgs.length > 0) {
                      return msgs.slice(-5).map((msg: any, idx: number) => (
                        <ChatBubble
                          key={idx}
                          message={msg}
                          isCustomer={msg.senderType === 'customer'}
                          showAvatar
                        />
                      ));
                    }
                  } catch { /* ignore parse errors */ }
                  return null;
                })()}
                <p className="text-[10px] text-muted-foreground text-right pt-1">
                  {conv.lastMessageAt ? formatDateTime(conv.lastMessageAt) : ''}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </ScrollArea>
  );
}
